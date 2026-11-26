import 'server-only';
import { privateDb } from '@/lib/cloudflarePrivate';
import { auditedMutation, OperationError, requiredText, revision } from './mutations';
export type ReportNotice = {scan_id:string;extension_id:string;version:string;artifact_sha256:string;state:string;public_note:string;revision:number;updated_at:string};
export async function reportNotice(scanId:string):Promise<ReportNotice|null> {
 return privateDb().prepare('SELECT scan_id,extension_id,version,artifact_sha256,state,public_note,revision,updated_at FROM app_report_notices WHERE scan_id=?').bind(scanId).first<ReportNotice>();
}
export async function attachReportNotice(product:Record<string,unknown>|null):Promise<Record<string,unknown>|null> {
 if(!product?.scan||typeof product.scan!=='object')return product;
 const scan=product.scan as Record<string,unknown>;
 try{const notice=await reportNotice(String(scan.id||''));return{...product,scan:{...scan,report_notice:notice,report_notice_availability:'available',assessment_current:!notice||notice.state==='resolved'}};}
 catch{return{...product,scan:{...scan,report_notice_availability:'unavailable'}};}
}
export async function saveNotice(b:Record<string,unknown>,actor:string,identity:{id:string;extension_id:string;version:string;artifact_sha256:string}) {
 const state=requiredText(b,'state',40),note=requiredText(b,'public_note',2500),reason=requiredText(b,'reason',1000),now=new Date().toISOString();
 if(!['under_review','corrected','withdrawn','resolved'].includes(state))throw new OperationError('Invalid notice state.');
 const old=await reportNotice(identity.id),db=privateDb();
 if(old) await auditedMutation(db.prepare('UPDATE app_report_notices SET state=?,public_note=?,revision=revision+1,updated_by=?,updated_at=? WHERE scan_id=? AND revision=?').bind(state,note,actor,now,identity.id,revision(b)),actor,'report.notice',identity.id,{state,reason});
 else await auditedMutation(db.prepare('INSERT INTO app_report_notices(scan_id,extension_id,version,artifact_sha256,state,public_note,updated_by,updated_at) VALUES(?,?,?,?,?,?,?,?)').bind(identity.id,identity.extension_id,identity.version,identity.artifact_sha256,state,note,actor,now),actor,'report.notice',identity.id,{state,reason});
 return{ok:true};
}
