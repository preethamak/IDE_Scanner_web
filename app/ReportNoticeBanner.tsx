'use client';
import { useEffect,useState } from 'react';
import type { ReportNotice } from '@/lib/admin/reportNotices';
export default function ReportNoticeBanner({scanId,initial}:{scanId:string;initial?:ReportNotice|null}) {
 const [notice,setNotice]=useState(initial||null),[unavailable,setUnavailable]=useState(false);
 useEffect(()=>{const controller=new AbortController();fetch(`/api/public/report-notices?scan_id=${encodeURIComponent(scanId)}`,{cache:'no-store',signal:controller.signal}).then(async r=>{if(!r.ok)throw Error();const body=await r.json();setNotice(body.notice);setUnavailable(false);}).catch(()=>{if(!controller.signal.aborted)setUnavailable(true);});return()=>controller.abort();},[scanId]);
 if(unavailable)return <aside className="reportNotice" role="status">The current report-notice status could not be verified. This report records its original assessment.</aside>;
 if(!notice||notice.state==='resolved')return null;
 return <aside className="reportNotice" role="alert"><strong>Report {notice.state.replaceAll('_',' ')}</strong><p>{notice.public_note}</p><small>Notice revision {notice.revision} · {notice.updated_at.slice(0,10)}. Original evidence is preserved; this historical assessment should not be treated as current approval.</small></aside>;
}
