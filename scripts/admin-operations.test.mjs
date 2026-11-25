import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {createHash} from 'node:crypto';
import {beforeEach,afterEach,describe,it,expect,vi} from 'vitest';
import {PDFDocument} from 'pdf-lib';
const state=vi.hoisted(()=>({db:null,user:{id:'owner',email:'owner@example.test'},env:{}}));
vi.mock('@/lib/cloudflarePrivate',()=>({privateDb:()=>state.db,nowIso:()=>new Date().toISOString(),newId:()=>crypto.randomUUID(),userFromSession:async()=>state.user,createSession:async()=>'gr_local_session',sessionCookie:token=>`gr_session=${token}; Path=/; HttpOnly; Secure; SameSite=Lax`,parseCookies:header=>Object.fromEntries(header.split(';').filter(Boolean).map(part=>part.trim().split('=')))}));
vi.mock('@/lib/auth',()=>{class AuthenticationError extends Error{}return{AuthenticationError,authenticated:async()=>{if(!state.user)throw new AuthenticationError();return{user:state.user};}};});
vi.mock('@/lib/runtimeEnv',()=>({runtimeEnv:name=>state.env[name]||''}));
vi.mock('@opennextjs/cloudflare',()=>({getCloudflareContext:()=>{throw Error('no request context');}}));
import {canAdmin,operationSections} from '@/lib/admin/permissions';
import {requireAdmin} from '@/lib/admin/access';
import {adminFilters} from '@/lib/admin/data';
import {readOperations,operate} from '@/lib/admin/operations';
import {evaluateAdminHealth} from '@/lib/admin/healthWorker';
import {studioAction,socialPost,verifyPostFacts,artifactFromRow} from '@/lib/admin/studio';
import {socialPdf} from '@/lib/admin/socialPdf';
import {publishScheduledPosts,reconcileCompanyPost} from '@/lib/admin/publishingWorker';
import {recordModelUsage} from '@/lib/admin/modelUsage';
import {attachReportNotice,saveNotice} from '@/lib/admin/reportNotices';
import {authenticateCloudflareApiKey} from '@/lib/cloudflareApiKeys';
import {hashApiKey} from '@/lib/apiKeys';
import {formatGateResult} from '@/lib/gateLookup';
import {adminHostRedirect} from '@/lib/admin/domains';
import {GET as sso} from '@/app/api/admin/sso/[action]/route';
let sql;
const now=()=>new Date().toISOString();
beforeEach(()=>{
 state.user={id:'owner',email:'owner@example.test'};state.env={ABSCISSA_ADMIN_USER_IDS:'owner',LINKEDIN_ACCESS_TOKEN:'local-test-token',LINKEDIN_API_VERSION:'202609',LINKEDIN_ORGANIZATION_URN:'urn:li:organization:123',LINKEDIN_TOKEN_EXPIRES_AT:new Date(Date.now()+86400_000).toISOString()};
 sql=new DatabaseSync(':memory:');
 for(const file of ['0003_private_guardrails.sql','0018_workspace_api_keys.sql','0019_admin_analytics.sql','0020_admin_operations.sql'])sql.exec(readFileSync('d1/migrations/'+file,'utf8'));
 function statement(query,values=[]){return{bind:(...v)=>statement(query,v),first:async()=>sql.prepare(query).get(...values)||null,all:async()=>({results:sql.prepare(query).all(...values)}),run:async()=>{const result=sql.prepare(query).run(...values);return{meta:{changes:Number(result.changes)}};}};}
 state.db={prepare:statement,batch:async statements=>{sql.exec('BEGIN');try{const results=[];for(const statement of statements)results.push(await statement.run());sql.exec('COMMIT');return results;}catch(error){sql.exec('ROLLBACK');throw error;}}};
 for(const id of ['owner','viewer','operator','editor','publisher','other'])sql.prepare('INSERT INTO app_users VALUES(?,?,?,?,?,?,?)').run(id,id+'@example.test',id,'github',id,now(),now());
 for(const role of ['viewer','operator','editor','publisher'])sql.prepare('INSERT INTO app_admin_members VALUES(?,?,1,?,?)').run(role,role,'owner',now());
});
afterEach(()=>{sql.close();vi.unstubAllGlobals();});
const job=(id,status='failed',attempts=1)=>sql.prepare('INSERT INTO app_scan_jobs(id,extension_id,version,status,attempt_count,created_at,updated_at) VALUES(?,?,?,?,?,?,?)').run(id,'example.extension','1.0.0',status,attempts,now(),now());
const request=(host,path)=>new Request('https://'+host+path,{headers:{host}});
async function makePost(){
 let result=await studioAction('save-fact',{title:'Exact-release evidence',statement:'GuardRails records the artifact hash for an analyzed release.',source_url:'https://abscissa.dev/research',lifecycle:'shipped',expires_at:new Date(Date.now()+7*86400_000).toISOString(),reason:'Documented behavior'},'editor');
 await studioAction('approve-fact',{id:result.id,revision:1,claims_checked:true,reason:'Checked the implementation'},'publisher');
 return studioAction('generate',{fact_ids:[result.id],format:'explainer',reason:'Prepare a company briefing'},'editor');
}
async function approvePost(post){post=await studioAction('review',{id:post.id,revision:post.revision,reason:'Ready for review'},'editor');return studioAction('approve',{id:post.id,revision:post.revision,claims_checked:true,reason:'Reviewed caption and PDF'},'publisher');}
async function scheduledPost(){let post=await approvePost(await makePost());post=await studioAction('schedule',{id:post.id,revision:post.revision,scheduled_at:new Date(Date.now()+120_000).toISOString(),reason:'Approved campaign'},'publisher');sql.prepare('UPDATE app_social_posts SET scheduled_at=? WHERE id=?').run(new Date(Date.now()-60000).toISOString(),post.id);return socialPost(post.id);}

describe('operational access and real SQL',()=>{
 it('separates content, publishing, operations and owner-only access',async()=>{
  expect(canAdmin('editor','publishing:review')).toBe(false);expect(canAdmin('publisher','operations:write')).toBe(false);expect(canAdmin('administrator','access:write')).toBe(false);
  state.user={id:'viewer'};await expect(requireAdmin(new Request('https://abscissa.dev'),'operations:read')).rejects.toMatchObject({status:403});
  state.user={id:'editor'};await expect(requireAdmin(new Request('https://abscissa.dev'),'content:write')).resolves.toMatchObject({id:'editor'});
  sql.prepare('UPDATE app_admin_members SET active=0 WHERE user_id=?').run('editor');await expect(requireAdmin(new Request('https://abscissa.dev'),'content:write')).rejects.toMatchObject({status:403});
 });
 it('executes every operations query against the migrated database',async()=>{
  for(const section of operationSections.filter(section=>!['studio','facts'].includes(section.key))){const result=await readOperations(section.key,adminFilters(new URLSearchParams()));expect(result.rows,section.key).toBeInstanceOf(Array);}
 });
 it('retries an eligible failure once, rejects stale and active work, and audits outcomes',async()=>{
  job('failed');const record=sql.prepare('SELECT updated_at FROM app_scan_jobs WHERE id=?').get('failed');
  await operate('retry',{id:'failed',updated_at:record.updated_at,reason:'Transient runner failure'},'operator');
  expect(sql.prepare('SELECT status FROM app_scan_jobs WHERE id=?').get('failed').status).toBe('queued');
  await expect(operate('retry',{id:'failed',updated_at:record.updated_at,reason:'Duplicate request'},'operator')).rejects.toMatchObject({status:409});
  expect(sql.prepare('SELECT outcome FROM app_admin_audit ORDER BY rowid DESC LIMIT 1').get().outcome).toBe('rejected');
  job('another-failure');const other=sql.prepare('SELECT updated_at FROM app_scan_jobs WHERE id=?').get('another-failure');
  await expect(operate('retry',{id:'another-failure',updated_at:other.updated_at,reason:'Competing release job'},'operator')).rejects.toMatchObject({status:409});
 });
 it('counts an ordered session funnel rather than independent event totals',async()=>{
  const insert=sql.prepare('INSERT INTO app_analytics_events(id,occurred_at,name,path,session_id) VALUES(?,?,?,?,?)');
  const names=['page_view','public_report_viewed','deep_scan_requested','watch_created','workspace_created'];
  for(let i=0;i<names.length;i++)insert.run('a'+i,new Date(Date.now()-50000+i*1000).toISOString(),names[i],i?'':'/registry','ordered');
  insert.run('bad-report',new Date(Date.now()-60000).toISOString(),'public_report_viewed','','reverse');insert.run('bad-start',now(),'page_view','/registry','reverse');
  const result=await readOperations('funnel',adminFilters(new URLSearchParams()));expect(result.rows.map(row=>row.sessions)).toEqual([2,1,1,1,1]);
 });
 it('supports key expiration, revocation and usage without returning credential hashes',async()=>{
  sql.prepare('INSERT INTO app_teams VALUES(?,?,?,?,?)').run('team','Team','team','owner',now());const raw='grk_test-key';
  sql.prepare('INSERT INTO app_workspace_api_keys(id,team_id,label,key_prefix,key_hash,created_by,created_at) VALUES(?,?,?,?,?,?,?)').run('key','team','CI','grk_test',hashApiKey(raw),'owner',now());
  expect(await authenticateCloudflareApiKey(raw)).toMatchObject({keyId:'key'});expect(sql.prepare('SELECT requests FROM app_api_key_usage').get().requests).toBe(1);
  const result=await readOperations('keys',adminFilters(new URLSearchParams()));expect(JSON.stringify(result)).not.toContain(hashApiKey(raw));
  sql.prepare('UPDATE app_workspace_api_keys SET expires_at=?').run('2000-01-01T00:00:00Z');expect(await authenticateCloudflareApiKey(raw)).toBeNull();
  await operate('revoke-key',{id:'key',reason:'Credential retired'},'operator');expect(sql.prepare('SELECT revoked_at FROM app_workspace_api_keys').get().revoked_at).toBeTruthy();
 });
 it('records reported usage with a pricing snapshot and leaves unknown usage unpriced',async()=>{
  await operate('pricing',{provider:'sarvam',model:'test-model',input_rate:1,output_rate:2,reason:'Configured contracted price'},'operator');
  await recordModelUsage('sarvam','test-model',{usage:{prompt_tokens:100,completion_tokens:50}});await recordModelUsage('sarvam','test-model',{});
  const result=await readOperations('usage',adminFilters(new URLSearchParams()));expect(result.rows[0]).toMatchObject({requests:2,usage_known:1,input_tokens:100,output_tokens:50,known_cost_usd:0.0002});
 });
 it('deduplicates incidents, keeps acknowledgements and resolves cleared conditions',async()=>{
  job('old','queued');sql.exec("UPDATE app_scan_jobs SET created_at='2000-01-01T00:00:00Z'");
  await evaluateAdminHealth(state.db,{});let incident=sql.prepare('SELECT * FROM app_admin_incidents').get();expect(incident.kind).toBe('queue_delay');
  await operate('acknowledge',{id:incident.fingerprint,reason:'Investigating runner capacity'},'operator');await evaluateAdminHealth(state.db,{});expect(sql.prepare('SELECT count(*) AS n FROM app_admin_incidents').get().n).toBe(1);expect(sql.prepare('SELECT state FROM app_admin_incidents').get().state).toBe('acknowledged');
  sql.exec("UPDATE app_scan_jobs SET status='complete'");await evaluateAdminHealth(state.db,{},new Date(Date.now()+1000));expect(sql.prepare('SELECT state FROM app_admin_incidents').get().state).toBe('resolved');
 });
 it('adds report notices without mutating original evidence',async()=>{
  const identity={id:'scan',extension_id:'example.extension',version:'1.0.0',artifact_sha256:'a'.repeat(64)};const original={scan:{...identity,decision:'allow'},findings:[]};
  await saveNotice({state:'withdrawn',public_note:'The network evidence is being rechecked.',reason:'New conflicting evidence'},'operator',identity);
  const annotated=await attachReportNotice(original);expect(annotated.scan.assessment_current).toBe(false);expect(annotated.scan.decision).toBe('allow');expect(original.scan.report_notice).toBeUndefined();
  expect(formatGateResult({extension:'example.extension',version:'1.0.0'},annotated.scan,true).verdict).toBe('fail');
 });
 it('preserves quality-review history and rejects stale updates atomically',async()=>{
  job('job','complete');sql.prepare('INSERT INTO app_scan_reports VALUES(?,?,?,?,?,?,?)').run('scan','job','example.extension','1.0.0','a'.repeat(64),'{}',now());
  const data={scan_id:'scan',rule_id:'test.rule',label:'unconfirmed',rationale:'Needs corroboration',evidence_url:'https://abscissa.dev/research',reason:'Initial report'};
  const result=await operate('quality',data,'operator');await operate('quality',{...data,id:result.id,revision:1,label:'false_positive',reason:'Confirmed benign behavior'},'operator');
  await expect(operate('quality',{...data,id:result.id,revision:1,label:'confirmed_issue',reason:'Stale browser'},'operator')).rejects.toMatchObject({status:409});
  expect(sql.prepare('SELECT count(*) AS n FROM app_quality_reviews').get().n).toBe(2);
 });
});

describe('reviewable company publishing',()=>{
 it('requires approved facts and explicit review; edits remove approval and schedule',async()=>{
  let post=await makePost();expect(post.state).toBe('draft');await expect(studioAction('schedule',{id:post.id,revision:post.revision,scheduled_at:new Date(Date.now()+120000).toISOString(),reason:'Skip approval'},'publisher')).rejects.toMatchObject({status:409});
  post=await approvePost(post);const before=artifactFromRow(post);post=await studioAction('edit-post',{...before,id:post.id,revision:post.revision,caption:before.caption+'\nA reviewed editorial change.',reason:'Edit caption'},'editor');expect(post.state).toBe('draft');expect(post.approved_hash).toBeNull();
 });
 it('blocks stale or withdrawn source facts before publishing',async()=>{
  const post=await approvePost(await makePost()),fact=JSON.parse(post.facts_json)[0];await studioAction('withdraw-fact',{id:fact.id,revision:fact.revision,reason:'Product behavior changed'},'publisher');await expect(verifyPostFacts(post)).rejects.toMatchObject({status:409});
 });
 it('rejects an unrenderable PDF before approving a post',async()=>{
  let post=await makePost();const artifact=artifactFromRow(post);artifact.slides[0].body='Unsupported script: ಕನ್ನಡ';
  post=await studioAction('edit-post',{id:post.id,revision:post.revision,title:post.title,caption:post.caption,hashtags:artifact.hashtags,slides:artifact.slides,reason:'Change slide language'},'editor');
  post=await studioAction('review',{id:post.id,revision:post.revision,reason:'Review edited PDF'},'editor');
  await expect(studioAction('approve',{id:post.id,revision:post.revision,claims_checked:true,reason:'Check PDF'},'publisher')).rejects.toMatchObject({status:400});expect((await socialPost(post.id)).state).toBe('in_review');
 });
 it('exports a real multi-page PDF with deterministic metadata',async()=>{
  const post=await makePost(),bytes=await socialPdf(artifactFromRow(post),'DRAFT - NOT APPROVED'),pdf=await PDFDocument.load(bytes);expect(pdf.getPageCount()).toBe(3);expect(pdf.getTitle()).toBe(post.title);expect(pdf.getCreationDate().getTime()).toBe(0);
 });
 it('prepares a document then publishes an approved artifact once',async()=>{
  const post=await scheduledPost();let publicCalls=0;
  vi.stubGlobal('fetch',vi.fn(async(url,init)=>{const address=String(url);if(address.endsWith('initializeUpload'))return Response.json({value:{uploadUrl:'https://www.linkedin.com/dms-uploads/test',document:'urn:li:document:abc'}});if(address.includes('/dms-uploads/'))return new Response(null,{status:201});if(address.includes('/documents/'))return Response.json({status:'AVAILABLE',owner:'urn:li:organization:123'});if(address.endsWith('/posts')){publicCalls++;expect(JSON.parse(init.body).author).toBe('urn:li:organization:123');return new Response(null,{status:201,headers:{'x-restli-id':'urn:li:share:456'}});}throw Error('Unexpected request');}));
  await publishScheduledPosts(state.db,state.env);expect((await socialPost(post.id)).state).toBe('processing');await publishScheduledPosts(state.db,state.env);await publishScheduledPosts(state.db,state.env);expect((await socialPost(post.id)).state).toBe('published');expect(publicCalls).toBe(1);expect(sql.prepare("SELECT action FROM app_admin_audit WHERE action IN ('social.publish-attempt','social.published') ORDER BY rowid").all().map(row=>row.action)).toEqual(['social.publish-attempt','social.published']);
 });
 it('does not automatically resend a public request after an ambiguous network failure',async()=>{
  const post=await scheduledPost();sql.prepare("UPDATE app_social_posts SET state='processing',document_urn='urn:li:document:abc' WHERE id=?").run(post.id);let attempts=0;
  vi.stubGlobal('fetch',vi.fn(async url=>{if(String(url).includes('/documents/'))return Response.json({status:'AVAILABLE',owner:'urn:li:organization:123'});attempts++;throw Error('Response lost');}));
  await publishScheduledPosts(state.db,state.env);expect((await socialPost(post.id)).state).toBe('unknown');await publishScheduledPosts(state.db,state.env);expect(attempts).toBe(1);
 });
 it('does not send documents or posts when the connection is missing',async()=>{
  await scheduledPost();const fetch=vi.fn();vi.stubGlobal('fetch',fetch);await publishScheduledPosts(state.db,{});expect(fetch).not.toHaveBeenCalled();
 });
 it('rejects reconciliation against a different company or caption',async()=>{
  const post=await scheduledPost();sql.prepare("UPDATE app_social_posts SET state='unknown',document_urn='urn:li:document:abc' WHERE id=?").run(post.id);vi.stubGlobal('fetch',vi.fn().mockResolvedValue(Response.json({author:'urn:li:organization:999',commentary:'Different content',lifecycleState:'PUBLISHED'})));
  await expect(reconcileCompanyPost(state.db,state.env,post.id,'urn:li:share:123')).rejects.toThrow('does not match');expect((await socialPost(post.id)).state).toBe('unknown');
 });
});

describe('admin hostname and single-use sign-in',()=>{
 it('routes only the admin host and does not expand cookie scope',()=>{
  expect(adminHostRedirect(request('admin.abscissa.dev','/')).pathname).toBe('/admin');expect(adminHostRedirect(request('admin.abscissa.dev','/pricing')).hostname).toBe('abscissa.dev');expect(adminHostRedirect(request('admin.abscissa.dev','/api/admin/operations/jobs'))).toBeNull();expect(adminHostRedirect(request('abscissa.dev','/'))).toBeNull();
 });
 it('binds a one-time ticket to the initiating browser and prevents replay',async()=>{
  const nonce='local-browser-nonce',challenge=createHash('sha256').update(nonce).digest('hex');
  const started=await sso(request('abscissa.dev','/api/admin/sso/start?challenge='+challenge),{params:Promise.resolve({action:'start'})});expect(started.status).toBe(307);const finishUrl=started.headers.get('location');
  const callback=()=>new Request(finishUrl,{headers:{host:'admin.abscissa.dev',cookie:'gr_admin_sso='+nonce}});
  const finished=await sso(callback(),{params:Promise.resolve({action:'finish'})});expect(finished.status).toBe(307);expect(finished.headers.get('set-cookie')).toContain('HttpOnly');expect(finished.headers.get('set-cookie')).not.toContain('Domain=');
  expect((await sso(callback(),{params:Promise.resolve({action:'finish'})})).status).toBe(403);
 });
});
