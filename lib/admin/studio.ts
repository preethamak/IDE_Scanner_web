import 'server-only';
import { createHash,randomUUID } from 'node:crypto';
import { privateDb } from '@/lib/cloudflarePrivate';
import { socialPdf } from './socialPdf';
import { runtimeEnv } from '@/lib/runtimeEnv';
import { auditedMutation,OperationError,requiredText,revision } from './mutations';
import { artifactPayload,buildSocialArtifact,publicFactUrl,validateArtifact,type FactSnapshot,type SocialArtifact } from './studioContract';
export type FactRow=FactSnapshot&{state:string;approved_by:string|null;approved_at:string|null;updated_at:string};
export type SocialRow={id:string;title:string;caption:string;hashtags_json:string;slides_json:string;facts_json:string;state:string;revision:number;artifact_hash:string;approved_hash:string|null;approved_by:string|null;approved_at:string|null;scheduled_at:string|null;company_urn:string|null;document_urn:string|null;remote_post_urn:string|null;publish_attempted_at:string|null;lease_until:string|null;last_error:string|null;created_by:string;created_at:string;updated_at:string};
export const socialHash=(artifact:SocialArtifact)=>createHash('sha256').update(artifactPayload(artifact)).digest('hex');
export function artifactFromRow(row:SocialRow):SocialArtifact {return{title:row.title,caption:row.caption,hashtags:JSON.parse(row.hashtags_json),slides:JSON.parse(row.slides_json),facts:JSON.parse(row.facts_json)};}
export function linkedinReadiness() {
 const company=runtimeEnv('LINKEDIN_ORGANIZATION_URN'),version=runtimeEnv('LINKEDIN_API_VERSION'),expires=runtimeEnv('LINKEDIN_TOKEN_EXPIRES_AT');
 const missing:string[]=[];if(!/^urn:li:organization:\d+$/.test(company))missing.push('LinkedIn company URN');if(!/^\d{6}$/.test(version))missing.push('supported LinkedIn API version');if(!runtimeEnv('LINKEDIN_ACCESS_TOKEN'))missing.push('company publishing token');if(!expires||!Number.isFinite(Date.parse(expires))||Date.parse(expires)<=Date.now())missing.push('valid token expiry');
 return{ready:!missing.length,company_urn:company||null,missing,token_expires_at:expires||null};
}
export async function listStudio(type:'facts'|'studio',q='',offset=0) {
 const db=privateDb();
 if(type==='facts') {
  const rows=(await db.prepare('SELECT id,title,statement,source_url,lifecycle,state,revision,expires_at,approved_by,approved_at,updated_at FROM app_product_facts WHERE title LIKE ? ORDER BY updated_at DESC,id LIMIT 51 OFFSET ?').bind(`%${q}%`,offset).all<FactRow>()).results;
  return{rows:rows.slice(0,50),next:rows.length>50};
 }
 const rows=(await db.prepare('SELECT id,title,state,revision,scheduled_at,approved_by,last_error,remote_post_urn,updated_at FROM app_social_posts WHERE title LIKE ? ORDER BY updated_at DESC,id LIMIT 51 OFFSET ?').bind(`%${q}%`,offset).all()).results;
 return{rows:rows.slice(0,50),next:rows.length>50,connection:linkedinReadiness()};
}
export async function socialPost(id:string) {return privateDb().prepare('SELECT * FROM app_social_posts WHERE id=?').bind(id).first<SocialRow>();}
async function approvedFacts(ids:string[]):Promise<FactSnapshot[]> {
 if(!ids.length||ids.length>6||new Set(ids).size!==ids.length)throw new OperationError('Choose one to six different facts.');
 const facts:FactSnapshot[]=[];
 for(const id of ids){const row=await privateDb().prepare('SELECT * FROM app_product_facts WHERE id=?').bind(id).first<FactRow>();if(!row||row.state!=='approved'||!row.approved_by||Date.parse(row.expires_at)<=Date.now())throw new OperationError('A selected fact is missing, expired, or not approved.',409);facts.push({id:row.id,revision:row.revision,title:row.title,statement:row.statement,source_url:row.source_url,lifecycle:row.lifecycle,expires_at:row.expires_at});}
 return facts;
}
export async function verifyPostFacts(post:SocialRow) {
 const artifact=artifactFromRow(post),current=await approvedFacts(artifact.facts.map(fact=>fact.id));
 if(JSON.stringify(current)!==JSON.stringify(artifact.facts)||socialHash(artifact)!==post.artifact_hash)throw new OperationError('Evidence changed. Regenerate and review this draft.',409);
 return artifact;
}
export async function studioAction(action:string,b:Record<string,unknown>,actor:string) {
 const db=privateDb(),now=new Date().toISOString(),reason=requiredText(b,'reason',1000);
 if(action==='save-fact'){
  const id=typeof b.id==='string'&&b.id?b.id:randomUUID(),title=requiredText(b,'title',160),statement=requiredText(b,'statement',1000),source=publicFactUrl(requiredText(b,'source_url',1000)),lifecycle=requiredText(b,'lifecycle',20),expires=requiredText(b,'expires_at',40);
  if(!['shipped','beta','planned'].includes(lifecycle)||!Number.isFinite(Date.parse(expires))||Date.parse(expires)<=Date.now()||Date.parse(expires)>Date.now()+366*86400_000)throw new OperationError('Choose a lifecycle and an expiry within the next year.');
  const write=b.id?db.prepare("UPDATE app_product_facts SET title=?,statement=?,source_url=?,lifecycle=?,expires_at=?,state='draft',approved_by=NULL,approved_at=NULL,revision=revision+1,updated_by=?,updated_at=? WHERE id=? AND revision=?").bind(title,statement,source,lifecycle,expires,actor,now,id,revision(b)):db.prepare("INSERT INTO app_product_facts(id,title,statement,source_url,lifecycle,expires_at,updated_by,updated_at) VALUES(?,?,?,?,?,?,?,?)").bind(id,title,statement,source,lifecycle,expires,actor,now);
  await auditedMutation(write,actor,'fact.save',id,{reason});return{ok:true,id};
 }
 if(action==='approve-fact'||action==='withdraw-fact'){
  const id=requiredText(b,'id',200),state=action==='approve-fact'?'approved':'withdrawn';
  if(action==='approve-fact'&&b.claims_checked!==true)throw new OperationError('Review the claim and source before approving.');
  await auditedMutation(db.prepare('UPDATE app_product_facts SET state=?,approved_by=?,approved_at=?,revision=revision+1,updated_by=?,updated_at=? WHERE id=? AND revision=? AND expires_at>?').bind(state,state==='approved'?actor:null,state==='approved'?now:null,actor,now,id,revision(b),now),actor,action,id,{reason});return{ok:true};
 }
 if(action==='generate'){
  if(!Array.isArray(b.fact_ids)||b.fact_ids.some(id=>typeof id!=='string'))throw new OperationError('Select approved facts.');
  const facts=await approvedFacts(b.fact_ids as string[]),format=['release','milestone','explainer'].includes(String(b.format))?b.format as 'release'|'milestone'|'explainer':'explainer';
  const artifact=buildSocialArtifact(facts,format),id=randomUUID();
  await auditedMutation(db.prepare('INSERT INTO app_social_posts(id,title,caption,hashtags_json,slides_json,facts_json,artifact_hash,created_by,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?)').bind(id,artifact.title,artifact.caption,JSON.stringify(artifact.hashtags),JSON.stringify(artifact.slides),JSON.stringify(artifact.facts),socialHash(artifact),actor,now,now),actor,'social.generate',id,{fact_ids:b.fact_ids,reason});return socialPost(id);
 }
 const id=requiredText(b,'id',200),post=await socialPost(id);if(!post)throw new OperationError('Post not found.',404);if(post.revision!==revision(b))throw new OperationError('This post changed. Reload it.',409);
 if(action==='edit-post'){
  if(!['draft','in_review','approved','scheduled','blocked','failed','cancelled'].includes(post.state))throw new OperationError('This post is being published or is already published. Create a new draft.',409);
  const old=artifactFromRow(post),artifact:SocialArtifact={...old,title:requiredText(b,'title',160),caption:requiredText(b,'caption',2700),hashtags:b.hashtags as string[],slides:b.slides as SocialArtifact['slides']};validateArtifact(artifact);
  await auditedMutation(db.prepare("UPDATE app_social_posts SET title=?,caption=?,hashtags_json=?,slides_json=?,artifact_hash=?,state='draft',approved_hash=NULL,approved_by=NULL,approved_at=NULL,scheduled_at=NULL,company_urn=NULL,document_urn=NULL,last_error=NULL,revision=revision+1,updated_at=? WHERE id=? AND revision=?").bind(artifact.title,artifact.caption,JSON.stringify(artifact.hashtags),JSON.stringify(artifact.slides),socialHash(artifact),now,id,post.revision),actor,'social.edit',id,{reason});return socialPost(id);
 }
 if(action==='review'){
  await verifyPostFacts(post);await auditedMutation(db.prepare("UPDATE app_social_posts SET state='in_review',revision=revision+1,updated_at=? WHERE id=? AND revision=? AND state='draft'").bind(now,id,post.revision),actor,'social.request_review',id,{reason});return socialPost(id);
 }
 if(action==='approve'){
  if(b.claims_checked!==true)throw new OperationError('Confirm that caption, hashtags, PDF slides, and all sources have been reviewed.');
  const artifact=await verifyPostFacts(post);try{await socialPdf(artifact);}catch{throw new OperationError('The PDF could not be rendered. Use supported Latin text and shorten long slides before review.');}
  await auditedMutation(db.prepare("UPDATE app_social_posts SET state='approved',approved_hash=artifact_hash,approved_by=?,approved_at=?,revision=revision+1,updated_at=? WHERE id=? AND revision=? AND state='in_review'").bind(actor,now,now,id,post.revision),actor,'social.approve',id,{artifact_hash:post.artifact_hash,reason});return socialPost(id);
 }
 if(action==='schedule'){
  const readiness=linkedinReadiness();if(!readiness.ready)throw new OperationError('Configure '+readiness.missing.join(', ')+' before scheduling.',503);
  const when=requiredText(b,'scheduled_at',40),time=Date.parse(when);if(!Number.isFinite(time)||time<Date.now()+60000||time>Date.now()+90*86400_000||time>=Date.parse(readiness.token_expires_at!))throw new OperationError('Choose a future time before the token expires, within 90 days.');
  await verifyPostFacts(post);await auditedMutation(db.prepare("UPDATE app_social_posts SET state='scheduled',scheduled_at=?,company_urn=?,revision=revision+1,updated_at=? WHERE id=? AND revision=? AND state='approved' AND approved_hash=artifact_hash").bind(new Date(time).toISOString(),readiness.company_urn,now,id,post.revision),actor,'social.schedule',id,{reason,scheduled_at:when,artifact_hash:post.artifact_hash,company_urn:readiness.company_urn});return socialPost(id);
 }
 if(action==='cancel'){
  await auditedMutation(db.prepare("UPDATE app_social_posts SET state='cancelled',revision=revision+1,updated_at=? WHERE id=? AND revision=? AND state NOT IN ('published','publishing','unknown') AND publish_attempted_at IS NULL").bind(now,id,post.revision),actor,'social.cancel',id,{reason});return socialPost(id);
 }
 throw new OperationError('Unknown studio action.',404);
}
