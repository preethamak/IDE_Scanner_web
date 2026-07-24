create or replace function public.publish_scan_result_atomically(
  p_job_id uuid,
  p_scan jsonb,
  p_findings jsonb default '[]'::jsonb,
  p_files jsonb default '[]'::jsonb,
  p_dependencies jsonb default '[]'::jsonb,
  p_previews jsonb default '[]'::jsonb,
  p_receipt_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_job public.scan_jobs%rowtype;
  v_existing public.scans%rowtype;
  v_scan_id uuid;
  v_created boolean := false;
  v_status text := p_scan ->> 'analysis_status';
  v_decision text := p_scan ->> 'decision';
  v_completed_at timestamptz := now();
  v_lifecycle_stage text;
begin
  perform set_config('statement_timeout', '15s', true);

  if jsonb_typeof(p_scan) <> 'object'
    or jsonb_typeof(p_findings) <> 'array'
    or jsonb_typeof(p_files) <> 'array'
    or jsonb_typeof(p_dependencies) <> 'array'
    or jsonb_typeof(p_previews) <> 'array' then
    raise exception 'Invalid scan publication payload';
  end if;
  if jsonb_array_length(p_findings) > 10000
    or jsonb_array_length(p_files) > 100000
    or jsonb_array_length(p_dependencies) > 50000
    or jsonb_array_length(p_previews) > 100 then
    raise exception 'Scan publication payload exceeds collection limits';
  end if;
  if exists (
    select 1
    from jsonb_to_recordset(p_previews) as preview(
      path text, content text, content_sha256 text, byte_length integer,
      truncated boolean
    )
    left join jsonb_to_recordset(p_files) as file(path text, sha256 text)
      on file.path = preview.path
    where preview.path is null
      or preview.path = ''
      or preview.path like '%\%'
      or preview.path like '/%'
      or preview.path ~ '(^|/)\.\.?(/|$)'
      or preview.byte_length > 204800
      or preview.byte_length <> octet_length(convert_to(preview.content, 'utf8'))
      or preview.content_sha256 <> encode(extensions.digest(convert_to(preview.content, 'utf8'), 'sha256'), 'hex')
      or file.sha256 <> preview.content_sha256
  ) then
    raise exception 'Source preview does not match exact artifact inventory';
  end if;

  select * into v_job
  from public.scan_jobs
  where id = p_job_id
  for update;
  if not found then
    raise exception 'Scan job was not found';
  end if;
  if v_job.status not in ('running', 'incomplete', 'failed', 'complete') then
    raise exception 'Scan job is not in a publishable state';
  end if;
  if p_receipt_id is not null and not exists (
    select 1
    from public.scan_callback_receipts
    where id = p_receipt_id
      and job_id = p_job_id
      and outcome in ('received', 'accepted')
  ) then
    raise exception 'Scan callback receipt is not publishable';
  end if;
  if p_scan ->> 'extension_id' <> v_job.extension_id
    or p_scan ->> 'version' <> v_job.version
    or p_scan ->> 'scan_purpose' <> v_job.scan_purpose
    or p_scan ->> 'scanner_build' <> v_job.expected_scanner_build then
    raise exception 'Scan result identity does not match its claimed job';
  end if;
  if v_status not in ('complete', 'incomplete', 'failed') then
    raise exception 'Invalid canonical analysis status';
  end if;
  if (v_status = 'complete' and v_decision not in ('allow', 'review', 'block'))
    or (v_status <> 'complete' and v_decision <> 'incomplete') then
    raise exception 'Analysis status and decision are inconsistent';
  end if;

  select * into v_existing
  from public.scans
  where job_id = p_job_id
  for update;
  if found and (
    v_existing.extension_id <> p_scan ->> 'extension_id'
    or v_existing.version <> p_scan ->> 'version'
    or v_existing.artifact_sha256 <> p_scan ->> 'artifact_sha256'
    or v_existing.scanner_build <> p_scan ->> 'scanner_build'
    or v_existing.ruleset_version <> p_scan ->> 'ruleset_version'
    or v_existing.intelligence_digest <> p_scan ->> 'intelligence_digest'
  ) then
    raise exception 'A scan job cannot publish two artifact identities';
  end if;
  if found then
    if v_existing.analysis_status <> v_status
      or v_existing.decision <> v_decision
      or v_existing.severity <> p_scan ->> 'severity'
      or v_existing.risk_score <> (p_scan ->> 'risk_score')::integer
      or v_existing.malware_score <> (p_scan ->> 'malware_score')::integer
      or v_existing.coverage_percent <> (p_scan ->> 'coverage_percent')::integer
      or v_existing.policy_version <> p_scan ->> 'policy_version' then
      raise exception 'A scan job cannot publish different canonical results';
    end if;
    v_scan_id := v_existing.id;
  end if;

  if v_scan_id is null then
    insert into public.scans (
    job_id, extension_id, version, artifact_sha256, profile, schema_version,
    scanner_version, scanner_build, ruleset_version, policy_version,
    intelligence_snapshot, intelligence_digest, scan_purpose, analysis_status,
    decision, decision_reason, public_outcome, decision_basis,
    evidence_confidence, provenance_tier, expected_profile_id,
    capability_assessment, score_schema_version, verdict, severity, risk_score,
    malware_score, coverage_percent, analysis_coverage, provider_coverage,
    security_dimensions, manifest, artifact_inventory, capabilities,
    baseline_diff, canonical_report, scanned_at
  )
  values (
    p_job_id,
    p_scan ->> 'extension_id',
    p_scan ->> 'version',
    p_scan ->> 'artifact_sha256',
    p_scan ->> 'profile',
    p_scan ->> 'schema_version',
    p_scan ->> 'scanner_version',
    p_scan ->> 'scanner_build',
    p_scan ->> 'ruleset_version',
    p_scan ->> 'policy_version',
    coalesce(p_scan -> 'intelligence_snapshot', '{}'::jsonb),
    p_scan ->> 'intelligence_digest',
    p_scan ->> 'scan_purpose',
    v_status,
    v_decision,
    p_scan ->> 'decision_reason',
    p_scan ->> 'public_outcome',
    p_scan ->> 'decision_basis',
    p_scan ->> 'evidence_confidence',
    p_scan ->> 'provenance_tier',
    nullif(p_scan ->> 'expected_profile_id', ''),
    coalesce(p_scan -> 'capability_assessment', '{}'::jsonb),
    p_scan ->> 'score_schema_version',
    p_scan ->> 'verdict',
    p_scan ->> 'severity',
    (p_scan ->> 'risk_score')::integer,
    (p_scan ->> 'malware_score')::integer,
    (p_scan ->> 'coverage_percent')::integer,
    coalesce(p_scan -> 'analysis_coverage', '{}'::jsonb),
    coalesce(p_scan -> 'provider_coverage', '{}'::jsonb),
    coalesce(p_scan -> 'security_dimensions', '{}'::jsonb),
    coalesce(p_scan -> 'manifest', '{}'::jsonb),
    coalesce(p_scan -> 'artifact_inventory', '{}'::jsonb),
    coalesce(p_scan -> 'capabilities', '{}'::jsonb),
    coalesce(p_scan -> 'baseline_diff', '{}'::jsonb),
    p_scan -> 'canonical_report',
    (p_scan ->> 'scanned_at')::timestamptz
  )
    on conflict on constraint scans_artifact_build_intelligence_identity_unique
    do nothing
    returning id into v_scan_id;
    v_created := v_scan_id is not null;
  end if;

  if v_scan_id is null then
    select * into v_existing
    from public.scans
    where extension_id = p_scan ->> 'extension_id'
      and version = p_scan ->> 'version'
      and artifact_sha256 = p_scan ->> 'artifact_sha256'
      and ruleset_version = p_scan ->> 'ruleset_version'
      and scanner_build = p_scan ->> 'scanner_build'
      and intelligence_digest = p_scan ->> 'intelligence_digest'
    for update;
    if not found then
      raise exception 'Immutable scan identity conflict could not be resolved';
    end if;
    if v_existing.analysis_status <> v_status
      or v_existing.decision <> v_decision
      or v_existing.severity <> p_scan ->> 'severity'
      or v_existing.risk_score <> (p_scan ->> 'risk_score')::integer
      or v_existing.malware_score <> (p_scan ->> 'malware_score')::integer
      or v_existing.coverage_percent <> (p_scan ->> 'coverage_percent')::integer
      or v_existing.policy_version <> p_scan ->> 'policy_version' then
      raise exception 'Reproducibility violation for immutable scan identity';
    end if;
    v_scan_id := v_existing.id;
  end if;

  if v_created then
    insert into public.findings (
      id, scan_id, rule_id, category, severity, confidence, evidence_class,
      actionability, summary, recommendation, file_refs, evidence
    )
    select
      item.id, v_scan_id, item.rule_id, item.category, item.severity,
      item.confidence, item.evidence_class, item.actionability, item.summary,
      item.recommendation, item.file_refs, item.evidence
    from jsonb_to_recordset(p_findings) as item(
      id text, rule_id text, category text, severity text, confidence numeric,
      evidence_class text, actionability text, summary text,
      recommendation text, file_refs jsonb, evidence jsonb
    );

    insert into public.artifact_files (
      scan_id, path, sha256, size_bytes, kind, target
    )
    select v_scan_id, item.path, item.sha256, item.size_bytes, item.kind, item.target
    from jsonb_to_recordset(p_files) as item(
      path text, sha256 text, size_bytes bigint, kind text, target text
    );

    insert into public.dependencies (
      scan_id, name, version, ecosystem, relationship, advisories
    )
    select
      v_scan_id, item.name, item.version, item.ecosystem,
      item.relationship, item.advisories
    from jsonb_to_recordset(p_dependencies) as item(
      name text, version text, ecosystem text, relationship text, advisories jsonb
    );

    insert into public.artifact_file_previews (
      scan_id, path, content, content_sha256, byte_length, truncated
    )
    select
      v_scan_id, item.path, item.content, item.content_sha256,
      item.byte_length, item.truncated
    from jsonb_to_recordset(p_previews) as item(
      path text, content text, content_sha256 text, byte_length integer,
      truncated boolean
    );
  end if;

  if v_status = 'complete' then
    update public.scans
    set superseded_at = null
    where id = v_scan_id;
    update public.scans
    set superseded_at = v_completed_at
    where extension_id = v_job.extension_id
      and version = v_job.version
      and scan_purpose = v_job.scan_purpose
      and id <> v_scan_id
      and superseded_at is null;
  end if;

  update public.extension_versions
  set artifact_sha256 = p_scan ->> 'artifact_sha256',
      latest_scan_id = v_scan_id,
      scan_state = v_status
  where extension_id = v_job.extension_id
    and version = v_job.version;
  if not found then
    raise exception 'Extension version was not found';
  end if;

  v_lifecycle_stage := case when v_status = 'failed' then 'failed' else 'completed' end;
  update public.scan_jobs
  set status = v_status,
      lifecycle_stage = v_lifecycle_stage,
      ruleset_version = p_scan ->> 'ruleset_version',
      callback_error = null,
      completed_at = v_completed_at,
      lease_expires_at = null,
      updated_at = v_completed_at,
      last_event_at = v_completed_at
  where id = p_job_id;

  insert into public.scan_runner_status (
    id, last_seen_at, last_success_at, last_error
  )
  values ('github-actions', v_completed_at, v_completed_at, null)
  on conflict (id) do update
    set last_seen_at = excluded.last_seen_at,
        last_success_at = excluded.last_success_at,
        last_error = null;

  insert into public.scan_job_events (job_id, stage, event_type, detail)
  select
    p_job_id,
    v_lifecycle_stage,
    'report_published',
    jsonb_build_object(
      'scan_id', v_scan_id,
      'decision', v_decision,
      'analysis_status', v_status,
      'reused_immutable_result', not v_created
    )
  where not exists (
    select 1
    from public.scan_job_events
    where job_id = p_job_id
      and event_type = 'report_published'
      and detail ->> 'scan_id' = v_scan_id::text
  );

  if p_receipt_id is not null then
    update public.scan_callback_receipts
    set outcome = 'accepted',
        error = null,
        completed_at = coalesce(completed_at, v_completed_at)
    where id = p_receipt_id
      and job_id = p_job_id
      and outcome in ('received', 'accepted');
    if not found then
      raise exception 'Scan callback receipt could not be accepted';
    end if;
  end if;

  return v_scan_id;
end;
$$;

revoke all on function public.publish_scan_result_atomically(
  uuid, jsonb, jsonb, jsonb, jsonb, jsonb, uuid
) from public, anon, authenticated;
grant execute on function public.publish_scan_result_atomically(
  uuid, jsonb, jsonb, jsonb, jsonb, jsonb, uuid
) to service_role;

comment on function public.publish_scan_result_atomically(
  uuid, jsonb, jsonb, jsonb, jsonb, jsonb, uuid
) is 'Atomically validates and publishes one immutable exact-artifact scan result.';
