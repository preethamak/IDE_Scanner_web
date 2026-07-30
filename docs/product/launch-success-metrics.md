# Launch Success Metrics

GuardRails measures the public-to-team workflow without collecting artifact
contents, hashes, report evidence, email addresses, or notification targets in
product analytics.

| Event | Route / owner | Properties | Retention | Weekly launch target |
| --- | --- | --- | --- | --- |
| `public_search_submitted` | `/`, `/catalog`; Growth | source route, query length | 90 days | Establish baseline |
| `catalog_result_opened` | `/catalog`; Growth | source route, registry | 90 days | 35% of searches |
| `public_report_viewed` | report routes; Product | source route, public outcome | 90 days | 80% of result opens |
| `workspace_signup_started` | report, monitor, account; Growth | source route, entry point | 90 days | 8% of report viewers |
| `workspace_created` | `/workspace`; Product | source route | 90 days | 65% of sign-up starts |
| `watch_created` | monitor/report; Product | source route, personal/team scope | 90 days | 25% of new workspaces |
| `decision_created` | report/workspace; Security product | source route, decision | 90 days | 15% of active workspaces |
| `alert_delivered` | notification worker; Platform | source route, channel | 30 days | 99% delivery success |
| `alert_acknowledged` | workspace/monitor; Security product | source route, personal/team scope | 90 days | 70% within one business day |

Review the funnel weekly with Growth, Product, Security Product, and Platform.
Pause acquisition experiments if public-report availability, exact-artifact
identity, or notification delivery falls below the release thresholds in the
launch runbook.
