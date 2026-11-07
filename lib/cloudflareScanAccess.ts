import "server-only";
import { privateDb } from "@/lib/cloudflarePrivate";

/** Resolve a scan identity only when the actor already has access to it. */
export async function getCloudflareAccessibleScanIdentity(scanId: string, userId: string) {
  return privateDb().prepare(`
    SELECT report.scan_id,report.extension_id,report.version,report.artifact_sha256
    FROM app_scan_reports report
    WHERE report.scan_id=? AND (
      EXISTS (
        SELECT 1 FROM app_scan_jobs job
        JOIN app_scan_job_subscribers subscriber ON subscriber.job_id=job.id
        WHERE job.id=report.job_id AND subscriber.user_id=?
          AND job.status='complete'
          AND job.scan_purpose IN ('user_request','guest_trial','team_badge')
      ) OR EXISTS (
        SELECT 1 FROM app_scan_publication_release_reports member
        JOIN app_scan_publication_releases release ON release.id=member.release_id
        WHERE member.scan_id=report.scan_id AND release.active=1
          AND coalesce(release.accuracy_gate_corpus_id,'')<>''
          AND coalesce(release.accuracy_gate_corpus_version,'')<>''
          AND length(coalesce(release.accuracy_gate_sha256,''))=64
          AND coalesce(release.accuracy_gate_sha256,'') NOT GLOB '*[^0-9a-f]*'
      )
    ) LIMIT 1
  `).bind(scanId, userId).first<Record<string, unknown>>();
}
