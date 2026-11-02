# First visitor acquisition kit

The first task is restoring measurement. Production blocked Google Analytics at the CSP level, so the existing zero cannot establish actual audience size. No historical count can be recovered from GA for requests it never received. Use Cloudflare's existing analytics, if available, to distinguish requests, bots, and human traffic; do not equate all requests with visitors.

## What to measure after deployment

1. Open the live site in a clean browser, accept analytics, and check GA Realtime or DebugView for your own visit. Verify the existing property G-TRTLLGPJ5C is the intended Abscissa property. This self-test verifies instrumentation; it is not an acquired visitor.
2. In DevTools, confirm the gtag script loads and GA collection requests are allowed. Declining must leave the tag unloaded, and revoking consent must disable the library.
3. Track the existing product events: public_search_submitted, catalog_result_opened, public_report_viewed, workspace_signup_started, workspace_created, watch_created. GA receives these only when consent is granted. Missing consented events are not proof nobody used the product.
4. Record acquired users by campaign and source, engaged visits, registry searches, report views, signups, and monitoring activation. Preserve the difference between search impressions, clicks, visits, and conversions.
5. Verify Search Console and record index coverage and page/query impressions. The public search samples show some Abscissa pages, but cannot establish Google index completeness or traffic volume.

## Three ready-to-review distribution drafts

These are drafts for the owner to publish or authorize. Nothing has been posted, emailed, or submitted to someone else.

### LinkedIn: an original correction, not a generic launch

Our extension scanner initially blocked a Red Hat extension after an advisory matched a bundled dependency.

We checked the exact package and version. The matched npm package was a reserved security placeholder, not executable malware. We corrected the rule narrowly and documented the artifact, advisory, and decision.

The practical lesson: a severe label still needs reproducible evidence. Publisher reputation alone is insufficient, and a scanner score alone is insufficient too.

Here is the full case and what we changed:
https://abscissa.dev/research/redhat-fabric8-analytics-false-positive?utm_source=linkedin&utm_medium=organic_social&utm_campaign=artifact_review

If you review developer tooling, what evidence do you keep with an approval?

### Developer community: a useful review checklist

I built GuardRails to inspect the VS Code extension package itself, rather than scan source code inside the editor.

I put together a practical pre-install checklist: confirm publisher.extension, preserve the exact version and artifact hash, review capabilities against purpose, read coverage gaps, and revisit the decision after updates. There is also a free CSV review template.

Guide: https://abscissa.dev/guides/check-vscode-extension-safety?utm_source=developer_community&utm_medium=community&utm_campaign=artifact_review

I would appreciate feedback on what would make this checklist useful in your actual extension review process.

Publish only in a community/thread where self-promotion is permitted and the content answers the discussion. Identify yourself as the builder. Do not post repeated links across unrelated threads.

### Security-team audience: reusable reference asset

An extension allowlist needs more than a list of names. A useful review record keeps the exact release, evidence, owner, unresolved coverage gaps, decision, and next review trigger together.

We published a workflow and a reusable CSV template. It distinguishes evidence collection from VS Code's actual policy enforcement; a saved review does not configure the editor for you.

Workflow: https://abscissa.dev/guides/vscode-extension-allowlist?utm_source=linkedin&utm_medium=organic_social&utm_campaign=team_allowlist

## Narrow distribution sequence

After the links are live and tracking is verified, start with the existing Abscissa LinkedIn audience and the founder's existing developer network. Publish one original case, then the checklist where relevant. Use campaign links above so results can be attributed. Track responses and actual guide-to-registry activity before increasing distribution.

For journalist queries, contribute the exact-artifact false-positive correction or the evidence-review method only when relevant. Do not pitch unmeasured malware prevalence, invented customer results, or claims that a scan proves universal safety. Source of Sources and Featured accounts and actual journalist requests were not available during this work.

A practical first milestone is ten relevant external visitors who try an extension search, followed by learning why they do or do not open a report. This is a proposed milestone, not a forecast or an achieved result. Set a time-bound acquisition target after observing the first campaigns and the real baseline.
