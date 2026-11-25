import { createHash,randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server';
import { adminRole, requireAdmin } from '@/lib/admin/access';
import { ADMIN_HOST, PRODUCT_ORIGIN, requestHost } from '@/lib/admin/domains';
import { privateDb, parseCookies, createSession, sessionCookie } from '@/lib/cloudflarePrivate';
export const dynamic='force-dynamic';
const digest=(value:string)=>createHash('sha256').update(value).digest('hex');
const headers={'Cache-Control':'private, no-store','Referrer-Policy':'no-referrer'};
export async function GET(request:Request,{params}:{params:Promise<{action:string}>}) {
 const action=(await params).action,url=new URL(request.url),host=requestHost(request);
 try {
  if(action==='login'&&host===ADMIN_HOST){
   const nonce=randomBytes(32).toString('base64url'),challenge=digest(nonce);
   const next='/api/admin/sso/start?challenge='+challenge;
   const response=NextResponse.redirect(new URL('/account?next='+encodeURIComponent(next),PRODUCT_ORIGIN),{headers});
   response.cookies.set('gr_admin_sso',nonce,{httpOnly:true,secure:true,sameSite:'lax',path:'/api/admin/sso',maxAge:120});return response;
  }
  if(action==='start'&&host==='abscissa.dev'){
   const challenge=url.searchParams.get('challenge')||'';if(!/^[a-f0-9]{64}$/.test(challenge))return Response.json({error:'Invalid sign-in challenge.'},{status:400,headers});
   const user=await requireAdmin(request),ticket=randomBytes(32).toString('base64url');
   await privateDb().prepare('INSERT INTO app_admin_sso_tickets(token_hash,user_id,challenge,expires_at) VALUES(?,?,?,?)').bind(digest(ticket),user.id,challenge,new Date(Date.now()+60000).toISOString()).run();
   return NextResponse.redirect(`https://${ADMIN_HOST}/api/admin/sso/finish?ticket=${encodeURIComponent(ticket)}`,{headers});
  }
  if(action==='finish'&&host===ADMIN_HOST){
   const ticket=url.searchParams.get('ticket')||'',nonce=parseCookies(request.headers.get('cookie')||'').gr_admin_sso||'';
   if(!/^[A-Za-z0-9_-]{43}$/.test(ticket)||!nonce)return Response.json({error:'Restart admin sign-in.'},{status:400,headers});
   const row=await privateDb().prepare('DELETE FROM app_admin_sso_tickets WHERE token_hash=? AND challenge=? AND expires_at>? RETURNING user_id').bind(digest(ticket),digest(nonce),new Date().toISOString()).first<{user_id:string}>();
   if(!row||!await adminRole(row.user_id))return Response.json({error:'Sign-in expired or access was revoked.'},{status:403,headers});
   const response=NextResponse.redirect(`https://${ADMIN_HOST}/admin`,{headers});response.headers.append('Set-Cookie',sessionCookie(await createSession(row.user_id)));
   response.cookies.set('gr_admin_sso','',{httpOnly:true,secure:true,sameSite:'lax',path:'/api/admin/sso',maxAge:0});return response;
  }
  return Response.json({error:'Not found.'},{status:404,headers});
 }catch{return Response.json({error:'Admin sign-in could not complete. Sign in on abscissa.dev using an authorized account, then retry.'},{status:403,headers});}
}
