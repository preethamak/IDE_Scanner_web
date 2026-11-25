import { revalidatePath } from 'next/cache';
import { requireAdmin,AdminAccessError } from '@/lib/admin/access';
import { operationSections,type AdminPermission } from '@/lib/admin/permissions';
import { readOperations,operate } from '@/lib/admin/operations';
import { adminFilters } from '@/lib/admin/data';
import { boundedJson,sameOrigin,csvCell } from '@/lib/admin/validation';
import { privateResponseHeaders } from '@/lib/admin/catalog';
import { OperationError,requiredText } from '@/lib/admin/mutations';
import { listStudio,socialPost,studioAction,artifactFromRow } from '@/lib/admin/studio';
import { socialPdf } from '@/lib/admin/socialPdf';
import { getVersionScanProduct } from '@/lib/productData';
import { saveNotice } from '@/lib/admin/reportNotices';
import { privateDb } from '@/lib/cloudflarePrivate';
import { runtimeEnv } from '@/lib/runtimeEnv';
import { reconcileCompanyPost } from '@/lib/admin/publishingWorker';
const headers=privateResponseHeaders;
export const dynamic='force-dynamic';
type Context={params:Promise<{action:string}>};
const mutationPermissions:Record<string,AdminPermission>={retry:'operations:write','revoke-key':'keys:write','expire-key':'keys:write',role:'access:write',acknowledge:'operations:write',pricing:'operations:write',notice:'quality:write',quality:'quality:write','save-fact':'content:write','approve-fact':'publishing:review','withdraw-fact':'publishing:review',generate:'content:write','edit-post':'content:write',review:'content:write',approve:'publishing:review',schedule:'publishing:review',cancel:'publishing:review',reconcile:'publishing:review'};
export async function GET(request:Request,context:Context){
 try{
  const action=(await context.params).action,section=operationSections.find(item=>item.key===action);if(!section)return Response.json({error:'Not found.'},{status:404,headers});
  await requireAdmin(request,section.permission);
  const url=new URL(request.url),filters=adminFilters(url.searchParams),id=(url.searchParams.get('id')||'').slice(0,200);
  if(action==='studio'&&id){const post=await socialPost(id);if(!post)return Response.json({error:'Post not found.'},{status:404,headers});
   if(url.searchParams.get('format')==='pdf'){const bytes=await socialPdf(artifactFromRow(post),['approved','scheduled','preparing','processing','publishing','published'].includes(post.state)?'':'DRAFT - NOT APPROVED');return new Response(bytes.buffer as ArrayBuffer,{headers:{...headers,'Content-Type':'application/pdf','Content-Disposition':`attachment; filename="abscissa-${post.id}.pdf"`}});}return Response.json(post,{headers});}
  if(action==='facts'||action==='studio')return Response.json(await listStudio(action,filters.q,(filters.page-1)*50),{headers});
  const data=await readOperations(action,filters,id);
  if(url.searchParams.get('format')==='csv')return new Response([data.columns.map(csvCell).join(','),...data.rows.map(row=>data.columns.map(column=>csvCell(row[column])).join(','))].join('\r\n'),{headers:{...headers,'Content-Type':'text/csv; charset=utf-8','Content-Disposition':'attachment; filename="abscissa-operations-page.csv"'}});
  return Response.json(data,{headers});
 }catch(error){return failure(error);}
}
export async function POST(request:Request,context:Context){
 try{
  const action=(await context.params).action,permission=mutationPermissions[action];if(!permission)return Response.json({error:'Not found.'},{status:404,headers});
  const user=await requireAdmin(request,permission);if(!sameOrigin(request))return Response.json({error:'Origin rejected.'},{status:403,headers});
  let body;try{body=await boundedJson(request,50_000);}catch{throw new OperationError('Enter a valid request within the size limit.');}
  if(action==='notice'){
   const extension=requiredText(body,'extension_id',200),version=requiredText(body,'version',100),scanId=requiredText(body,'scan_id',200);
   const product=await getVersionScanProduct(extension,version,scanId),scan=product?.scan as Record<string,unknown>|undefined;
   if(!scan||String(scan.id)!==scanId||String(scan.extension_id).toLowerCase()!==extension.toLowerCase()||String(scan.version)!==version||!/^[a-f0-9]{64}$/i.test(String(scan.artifact_sha256)))throw new OperationError('A published, exact-artifact report is required.',404);
   const result=await saveNotice(body,user.id,{id:scanId,extension_id:String(scan.extension_id),version,artifact_sha256:String(scan.artifact_sha256)});
   revalidatePath(`/extensions/${encodeURIComponent(extension)}`);revalidatePath(`/extensions/${encodeURIComponent(extension)}/versions/${encodeURIComponent(version)}`);return Response.json(result,{headers});
  }
  if(action==='reconcile'){
   const id=requiredText(body,'id',200),reason=requiredText(body,'reason',1000),urn=requiredText(body,'remote_post_urn',150);
   const env=Object.fromEntries(['LINKEDIN_ACCESS_TOKEN','LINKEDIN_API_VERSION','LINKEDIN_ORGANIZATION_URN','LINKEDIN_TOKEN_EXPIRES_AT'].map(key=>[key,runtimeEnv(key)]));
   const result=await reconcileCompanyPost(privateDb(),env,id,urn,user.id,reason);
   return Response.json(result,{headers});
  }
  const socialActions=['save-fact','approve-fact','withdraw-fact','generate','edit-post','review','approve','schedule','cancel'];
  return Response.json(socialActions.includes(action)?await studioAction(action,body,user.id):await operate(action,body,user.id),{headers});
 }catch(error){return failure(error);}
}
function failure(error:unknown){
 if(error instanceof OperationError||error instanceof AdminAccessError)return Response.json({error:error.message},{status:error.status,headers});
 console.error('[admin-operations] request failed');return Response.json({error:'The operation could not complete. Check the input, database migration, and service configuration.'},{status:503,headers});
}
