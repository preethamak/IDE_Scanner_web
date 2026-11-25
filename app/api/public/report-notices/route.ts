import { reportNotice } from '@/lib/admin/reportNotices';
export const dynamic='force-dynamic';
export async function GET(request:Request) {
 const id=new URL(request.url).searchParams.get('scan_id')||'';
 if(!id||id.length>200)return Response.json({error:'Invalid scan ID.'},{status:400});
 try{return Response.json({notice:await reportNotice(id)},{headers:{'Cache-Control':'no-store'}});}
 catch{return Response.json({error:'Notice status is unavailable.'},{status:503,headers:{'Cache-Control':'no-store'}});}
}
