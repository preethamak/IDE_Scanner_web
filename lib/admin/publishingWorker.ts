import { createHash, randomUUID } from 'node:crypto';
import type { PrivateDatabase } from '@/lib/cloudflarePrivate';
import { artifactPayload,validateArtifact,type SocialArtifact } from './studioContract';
import { socialPdf } from './socialPdf';
import type { SocialRow } from './studio';
const api='https://api.linkedin.com/rest';
// This module also runs outside Next; keep the audit transaction worker-safe.
async function transition(db:PrivateDatabase, statement:unknown, id:string, action:string) {
 const result=await db.batch<{meta?:{changes?:number}}>([statement,db.prepare("INSERT INTO app_admin_audit(id,actor_id,action,subject,outcome,details_json,occurred_at) SELECT ?,?,?,?,?,?,? WHERE changes()>0").bind(randomUUID(),'system:linkedin',action,id,'applied','{}',new Date().toISOString())]);
 return Number(result[0]?.meta?.changes)>0;
}
function configuration(env:Record<string,unknown>) {
 const token=String(env.LINKEDIN_ACCESS_TOKEN||''),version=String(env.LINKEDIN_API_VERSION||''),company=String(env.LINKEDIN_ORGANIZATION_URN||''),expires=Date.parse(String(env.LINKEDIN_TOKEN_EXPIRES_AT||''));
 if(!token||!/^\d{6}$/.test(version)||!/^urn:li:organization:\d+$/.test(company)||!Number.isFinite(expires)||expires<=Date.now())throw Error('LinkedIn connection is missing or expired.');
 return{company,headers:{Authorization:`Bearer ${token}`,'LinkedIn-Version':version,'X-Restli-Protocol-Version':'2.0.0','Content-Type':'application/json'}};
}
const artifact=(row:SocialRow):SocialArtifact=>({title:row.title,caption:row.caption,hashtags:JSON.parse(row.hashtags_json),slides:JSON.parse(row.slides_json),facts:JSON.parse(row.facts_json)});
const commentary=(value:SocialArtifact)=>value.caption+'\n\n'+value.hashtags.join(' ');
async function verify(db:PrivateDatabase,post:SocialRow) {
 const value=artifact(post);validateArtifact(value);
 const hash=createHash('sha256').update(artifactPayload(value)).digest('hex');
 if(hash!==post.artifact_hash||post.approved_hash!==hash||!post.approved_by)throw Error('The approved artifact changed.');
 for(const fact of value.facts){const current=await db.prepare('SELECT revision,state,expires_at FROM app_product_facts WHERE id=?').bind(fact.id).first<{revision:number;state:string;expires_at:string}>();if(!current||current.revision!==fact.revision||current.state!=='approved'||Date.parse(current.expires_at)<=Date.now())throw Error('An approved source fact changed or expired.');}
 return value;
}
export async function publishScheduledPosts(db:PrivateDatabase,env:Record<string,unknown>,now=new Date()) {
 const time=now.toISOString();
 await db.prepare("UPDATE app_social_posts SET state='unknown',last_error='Publishing confirmation was lost. Check LinkedIn and reconcile the post; automatic resubmission is disabled.',revision=revision+1,updated_at=? WHERE state='publishing' AND lease_until<?").bind(time,time).run();
 await db.prepare("UPDATE app_social_posts SET state='failed',last_error='Document preparation timed out. Regenerate or review before retrying.',revision=revision+1,updated_at=? WHERE state='preparing' AND lease_until<?").bind(time,time).run();
 let config;try{config=configuration(env);}catch{ return; }
 const rows=await db.prepare("SELECT * FROM app_social_posts WHERE (state='scheduled' AND scheduled_at<=?) OR state='processing' ORDER BY scheduled_at LIMIT 3").bind(new Date(now.getTime()+10*60000).toISOString()).all<SocialRow>();
 for(let post of rows.results){
  let value:SocialArtifact;
  try{value=await verify(db,post);if(post.company_urn!==config.company)throw Error('The configured company changed. Review the destination again.');}
  catch(error){await db.prepare("UPDATE app_social_posts SET state='blocked',last_error=?,revision=revision+1,updated_at=? WHERE id=? AND state IN ('scheduled','processing')").bind(error instanceof Error?error.message:'Evidence verification failed.',time,post.id).run();continue;}
  const lease=new Date(now.getTime()+8*60000).toISOString();
  if(post.state==='scheduled'){
   const claimed=await db.prepare("UPDATE app_social_posts SET state='preparing',lease_until=?,revision=revision+1,updated_at=? WHERE id=? AND state='scheduled' AND artifact_hash=? AND approved_hash=artifact_hash RETURNING id").bind(lease,time,post.id,post.artifact_hash).first();if(!claimed)continue;
   try{
    const pdf=await socialPdf(value);
    const initialized=await fetch(`${api}/documents?action=initializeUpload`,{method:'POST',headers:config.headers,body:JSON.stringify({initializeUploadRequest:{owner:config.company}}),redirect:'error',signal:AbortSignal.timeout(20000)});
    if(!initialized.ok)throw Error(`LinkedIn document initialization returned ${initialized.status}.`);
    const payload=await initialized.json() as {value?:{uploadUrl?:string;document?:string}};
    const target=new URL(payload.value?.uploadUrl||'');
    if(target.protocol!=='https:'||target.hostname!=='www.linkedin.com'||!target.pathname.startsWith('/dms-uploads/')||target.username||target.password||!/^urn:li:document:[A-Za-z0-9_-]+$/.test(payload.value?.document||''))throw Error('LinkedIn returned an unsupported upload destination.');
    const uploaded=await fetch(target,{method:'PUT',headers:{Authorization:config.headers.Authorization,'Content-Type':'application/pdf'},body:pdf.buffer as ArrayBuffer,redirect:'error',signal:AbortSignal.timeout(30000)});
    if(!uploaded.ok)throw Error(`LinkedIn document upload returned ${uploaded.status}.`);
    await db.prepare("UPDATE app_social_posts SET state='processing',document_urn=?,lease_until=NULL,revision=revision+1,updated_at=? WHERE id=? AND state='preparing' AND artifact_hash=?").bind(payload.value!.document,time,post.id,post.artifact_hash).run();
   }catch(error){await db.prepare("UPDATE app_social_posts SET state='failed',last_error=?,lease_until=NULL,revision=revision+1,updated_at=? WHERE id=? AND state='preparing'").bind(error instanceof Error?error.message:'Document preparation failed.',time,post.id).run();}
   continue;
  }
  if(!post.document_urn)continue;
  try{
   const response=await fetch(`${api}/documents/${encodeURIComponent(post.document_urn)}`,{headers:config.headers,redirect:'error',signal:AbortSignal.timeout(15000)});
   if(!response.ok)throw Error(`LinkedIn document status returned ${response.status}.`);
   const document=await response.json() as {status?:string;owner?:string};
   if(document.owner!==config.company)throw Error('The uploaded document owner does not match the approved company.');
   if(document.status==='PROCESSING_FAILED')throw Error('LinkedIn could not process the document.');
   if(document.status!=='AVAILABLE'||!post.scheduled_at||Date.parse(post.scheduled_at)>now.getTime())continue;
   // Re-read and re-verify immediately before the irreversible public request.
   const fresh=await db.prepare('SELECT * FROM app_social_posts WHERE id=?').bind(post.id).first<SocialRow>();if(!fresh||fresh.state!=='processing')continue;post=fresh;value=await verify(db,post);
   const claimed=await transition(db,db.prepare("UPDATE app_social_posts SET state='publishing',publish_attempted_at=?,lease_until=?,revision=revision+1,updated_at=? WHERE id=? AND state='processing' AND approved_hash=artifact_hash").bind(time,lease,time,post.id),post.id,'social.publish-attempt');if(!claimed)continue;
   let result:Response;
   try{result=await fetch(`${api}/posts`,{method:'POST',headers:config.headers,redirect:'error',signal:AbortSignal.timeout(20000),body:JSON.stringify({author:config.company,commentary:commentary(value),visibility:'PUBLIC',distribution:{feedDistribution:'MAIN_FEED',targetEntities:[],thirdPartyDistributionChannels:[]},content:{media:{title:value.title,id:post.document_urn}},lifecycleState:'PUBLISHED',isReshareDisabledByAuthor:false})});}
   catch{await unknown(db,post.id,time,'LinkedIn response was lost. Inspect the company page and reconcile; do not resubmit automatically.');continue;}
   const urn=result.headers.get('x-restli-id');
   if(result.status===201&&/^urn:li:(share|ugcPost):\d+$/.test(urn||''))await transition(db,db.prepare("UPDATE app_social_posts SET state='published',remote_post_urn=?,last_error=NULL,lease_until=NULL,revision=revision+1,updated_at=? WHERE id=? AND state='publishing'").bind(urn,time,post.id),post.id,'social.published');
   else if(result.status>=400&&result.status<500)await db.prepare("UPDATE app_social_posts SET state='failed',last_error=?,lease_until=NULL,revision=revision+1,updated_at=? WHERE id=? AND state='publishing'").bind(`LinkedIn rejected the post (${result.status}). Review before retrying.`,time,post.id).run();
   else await unknown(db,post.id,time,`LinkedIn confirmation is ambiguous (${result.status}). Reconcile before taking another action.`);
  }catch(error){await db.prepare("UPDATE app_social_posts SET last_error=?,updated_at=? WHERE id=? AND state='processing'").bind(error instanceof Error?error.message:'Document status is unavailable.',time,post.id).run();}
 }
}
async function unknown(db:PrivateDatabase,id:string,time:string,message:string){await transition(db,db.prepare("UPDATE app_social_posts SET state='unknown',last_error=?,lease_until=NULL,revision=revision+1,updated_at=? WHERE id=? AND state='publishing'").bind(message,time,id),id,'social.unknown');}
export async function reconcileCompanyPost(db:PrivateDatabase,env:Record<string,unknown>,id:string,urn:string,actor='system:linkedin',reason='Verified remote post') {
 if(!/^urn:li:(share|ugcPost):\d+$/.test(urn))throw Error('Enter the LinkedIn post URN.');
 const post=await db.prepare('SELECT * FROM app_social_posts WHERE id=?').bind(id).first<SocialRow>();if(!post||!['unknown','publishing'].includes(post.state))throw Error('This post does not need reconciliation.');
 const config=configuration(env),value=artifact(post);
 const response=await fetch(`${api}/posts/${encodeURIComponent(urn)}`,{headers:config.headers,redirect:'error',signal:AbortSignal.timeout(15000)});
 if(!response.ok)throw Error(`LinkedIn could not verify the post (${response.status}). Read permission may be required.`);
 const actual=await response.json() as {author?:string;commentary?:string;lifecycleState?:string;content?:{media?:{id?:string}}};
 if(actual.author!==post.company_urn||actual.author!==config.company||actual.commentary!==commentary(value)||actual.lifecycleState!=='PUBLISHED'||actual.content?.media?.id!==post.document_urn)throw Error('The LinkedIn post does not match the approved artifact and company.');
 const result=await db.batch<{meta?:{changes?:number}}>([db.prepare("UPDATE app_social_posts SET state='published',remote_post_urn=?,lease_until=NULL,last_error=NULL,revision=revision+1,updated_at=? WHERE id=? AND revision=? AND state IN ('unknown','publishing')").bind(urn,new Date().toISOString(),id,post.revision),db.prepare("INSERT INTO app_admin_audit(id,actor_id,action,subject,outcome,details_json,occurred_at) SELECT ?,?,?,?,?,?,? WHERE changes()>0").bind(randomUUID(),actor,'social.reconcile',id,'applied',JSON.stringify({remote_post_urn:urn,reason}),new Date().toISOString())]);
 if(!Number(result[0]?.meta?.changes))throw Error('The post changed during reconciliation. Refresh before retrying.');return{ok:true};
}
