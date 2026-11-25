import type { PrivateDatabase } from '@/lib/cloudflarePrivate';
type Condition={fingerprint:string;kind:string;subject:string;severity:string;summary:string};
/** Worker-safe: no Next server-only imports. */
export async function evaluateAdminHealth(db:PrivateDatabase,env:Record<string,unknown>,now=new Date()) {
 const timestamp=now.toISOString(), fifteen=new Date(now.getTime()-15*60_000).toISOString(),hour=new Date(now.getTime()-3600_000).toISOString(),sixHours=new Date(now.getTime()-6*3600_000).toISOString();
 const [queue,failed,delivery,providers,monitoring,stalled]=await Promise.all([
  db.prepare("SELECT count(*) AS n FROM app_scan_jobs WHERE status='queued' AND created_at<?").bind(hour).first<{n:number}>(),
  db.prepare("SELECT count(*) AS n FROM app_scan_jobs WHERE status='failed' AND updated_at>=?").bind(fifteen).first<{n:number}>(),
  db.prepare("SELECT count(*) AS n FROM app_notification_deliveries WHERE status='failed' AND attempts>=3").first<{n:number}>(),
  db.prepare("SELECT provider,count(*) AS n,sum(CASE WHEN status=0 OR status>=500 THEN 1 ELSE 0 END) AS bad FROM app_analytics_events WHERE name IN ('provider_request','llm_request') AND occurred_at>=? GROUP BY provider").bind(fifteen).all<{provider:string;n:number;bad:number}>(),
  db.prepare("SELECT s.team_id FROM app_team_state s JOIN app_teams t ON t.id=s.team_id WHERE json_valid(s.state_json) AND json_array_length(json_extract(s.state_json,'$.watchlist'))>0 AND coalesce(json_extract(s.state_json,'$.monitoring.last_checked_at'),t.created_at)<?").bind(sixHours).all<{team_id:string}>(),
  db.prepare("SELECT count(*) AS n FROM app_scan_jobs WHERE status='running' AND coalesce(last_event_at,updated_at)<?").bind(fifteen).first<{n:number}>(),
 ]);
 const conditions:Condition[]=[];
 const add=(kind:string,subject:string,summary:string,severity='warning')=>conditions.push({fingerprint:`${kind}:${subject}`,kind,subject,summary,severity});
 if(Number(queue?.n)>0)add('queue_delay','scan_queue',`${queue!.n} scan jobs have waited more than one hour.`);
 if(Number(stalled?.n)>0)add('runner_progress','scan_runner',`${stalled!.n} running jobs have no progress event in the last 15 minutes. This does not prove the runner stopped.`);
 if(Number(failed?.n)>=3)add('scan_failures','scan_runner',`${failed!.n} scan failures were recorded in the last 15 minutes.`,'high');
 if(Number(delivery?.n)>0)add('delivery_failure','notifications',`${delivery!.n} notification deliveries have failed at least three times.`);
 for(const row of providers.results)if(row.n>=5&&row.bad/row.n>=0.5)add('provider_failure',row.provider,`${row.bad} of ${row.n} recent ${row.provider} requests failed.`,'high');
 for(const row of monitoring.results)add('monitoring_stale',row.team_id,'A workspace with active watches has not completed a check in over six hours.');
 for(const c of conditions)await db.prepare(`INSERT INTO app_admin_incidents(fingerprint,kind,subject,severity,summary,first_seen_at,last_seen_at) VALUES(?,?,?,?,?,?,?) ON CONFLICT(fingerprint) DO UPDATE SET severity=excluded.severity,summary=excluded.summary,last_seen_at=excluded.last_seen_at,notification_state=CASE WHEN app_admin_incidents.state='resolved' THEN 'pending' ELSE app_admin_incidents.notification_state END,state=CASE WHEN app_admin_incidents.state='resolved' THEN 'open' ELSE app_admin_incidents.state END`).bind(c.fingerprint,c.kind,c.subject,c.severity,c.summary,timestamp,timestamp).run();
 await db.prepare("UPDATE app_admin_incidents SET state='resolved' WHERE last_seen_at<? AND state!='resolved' AND kind IN ('queue_delay','scan_failures','delivery_failure','provider_failure','monitoring_stale','runner_progress')").bind(timestamp).run();
 const target=typeof env.ADMIN_ALERT_WEBHOOK_URL==='string'?env.ADMIN_ALERT_WEBHOOK_URL:'';
 if(!target)return;
 const url=new URL(target);if(url.protocol!=='https:'||url.username||url.password||!url.hostname.includes('.')||/^[\d.:]+$/.test(url.hostname)||/localhost|\.local$|\.internal$/.test(url.hostname))throw new Error('Invalid admin alert destination.');
 const pending=await db.prepare("SELECT fingerprint,kind,severity,summary FROM app_admin_incidents WHERE state IN ('open','acknowledged') AND notification_state='pending' LIMIT 10").all<Condition>();
 for(const incident of pending.results){
  const claimed=await db.prepare("UPDATE app_admin_incidents SET notification_state='sending' WHERE fingerprint=? AND notification_state='pending' RETURNING fingerprint").bind(incident.fingerprint).first();if(!claimed)continue;
  let status='failed';try{const response=await fetch(url,{method:'POST',redirect:'error',headers:{'Content-Type':'application/json'},body:JSON.stringify({product:'Abscissa',incident}),signal:AbortSignal.timeout(10000)});status=response.ok?'sent':'failed';}catch{/* Failed sends stay visible and are not blindly retried. */}
  await db.prepare('UPDATE app_admin_incidents SET notification_state=?,notified_at=? WHERE fingerprint=?').bind(status,status==='sent'?timestamp:null,incident.fingerprint).run();
 }
}
