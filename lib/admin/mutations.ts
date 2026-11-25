import 'server-only';
import { randomUUID } from 'node:crypto';
import { privateDb, type PrivateDatabase } from '@/lib/cloudflarePrivate';
export class OperationError extends Error { constructor(message:string, readonly status=400) { super(message); } }
export function requiredText(body:Record<string,unknown>, key:string, max=2000) {
 const value=body[key]; if(typeof value!=='string'||!value.trim()||value.length>max) throw new OperationError(`A valid ${key} is required.`); return value.trim();
}
export function revision(body:Record<string,unknown>) { if(!Number.isSafeInteger(body.revision)||Number(body.revision)<1) throw new OperationError('A current revision is required.'); return Number(body.revision); }
export async function auditedMutation(statement: unknown, actor:string, action:string, subject:string, details:Record<string,unknown>={}, db:PrivateDatabase=privateDb(), extras:unknown[]=[]) {
 const results=await db.batch<{meta?:{changes?:number}}>([statement,db.prepare(`INSERT INTO app_admin_audit(id,actor_id,action,subject,outcome,details_json,occurred_at) SELECT ?,?,?,?,CASE WHEN changes()>0 THEN 'applied' ELSE 'rejected' END,?,?`).bind(randomUUID(),actor,action,subject,JSON.stringify(details),new Date().toISOString()),...extras]);
 if(!Number(results[0]?.meta?.changes)) throw new OperationError('The record changed, is ineligible, or no longer exists. Refresh before retrying.',409);
}
