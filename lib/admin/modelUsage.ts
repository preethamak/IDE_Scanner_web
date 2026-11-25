import 'server-only';
import { randomUUID } from 'node:crypto';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { privateDb } from '@/lib/cloudflarePrivate';
export async function recordModelUsage(provider:string,model:string,payload:unknown) {
 try {
  const raw=payload&&typeof payload==='object'?(payload as {usage?:Record<string,unknown>}).usage:undefined;
  const token=(value:unknown)=>typeof value==='number'&&Number.isSafeInteger(value)&&value>=0?value:null;
  const input=token(raw?.prompt_tokens??raw?.input_tokens),output=token(raw?.completion_tokens??raw?.output_tokens),db=privateDb();
  const work=(async()=>{
   const price=await db.prepare('SELECT input_usd_per_million,output_usd_per_million,revision FROM app_llm_pricing WHERE provider=? AND model=?').bind(provider,model).first<{input_usd_per_million:number;output_usd_per_million:number;revision:number}>();
   await db.prepare('INSERT INTO app_llm_usage(id,provider,model,input_tokens,output_tokens,input_usd_per_million,output_usd_per_million,pricing_version,occurred_at) VALUES(?,?,?,?,?,?,?,?,?)').bind(randomUUID(),provider,model,input,output,price?.input_usd_per_million??null,price?.output_usd_per_million??null,price?String(price.revision):null,new Date().toISOString()).run();
  })().catch(()=>undefined);
  try{getCloudflareContext().ctx.waitUntil(work);}catch{await work;}
 }catch{/* Provider health is independent of optional usage storage. */}
}
