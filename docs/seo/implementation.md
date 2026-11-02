# Abscissa search acquisition workflow

## Scope and evidence

Implemented a first extension security cluster in the existing GuardRails site. Search-result samples were reviewed for five queries on 25 October 2026. They are search-provider samples, not a location-controlled Google ranking audit. Search volume, keyword difficulty, Search Console performance, actual conversion rates, and AI citation share were unavailable. Do not assign fabricated scores or describe any keyword as validated by volume.

The first cluster targets reviewing an extension package itself. Queries for a security scanner also return source-code scanners that run inside VS Code; the money page now makes its artifact boundary explicit. Existing pricing remains early access: billing has not opened.

## Keyword and page map

| Search phrase | Intent | Destination | Role |
| --- | --- | --- | --- |
| VS Code extension security scanner | Commercial | /vscode-extension-security | Primary category page |
| VS Code extension malware scanner | Commercial | /vscode-extension-security | Same underlying need; avoid a duplicate page |
| scan VS Code extension | Transactional | /registry | Public exact-release lookup |
| VS Code extension security report | Transactional | /registry | Evidence lookup |
| how to check if a VS Code extension is safe | Informational | /guides/check-vscode-extension-safety | First supporting guide |
| are VS Code extensions safe | Informational | /guides/check-vscode-extension-safety | Related question |
| VS Code verified publisher safety | Informational | /guides/check-vscode-extension-safety | Identity vs behavior distinction |
| scan VSIX file | Informational / commercial | /guides/scan-vsix-file | Inspection workflow |
| VSIX malware scanner | Commercial | /vsix-audit | Existing local inspection comparison |
| VS Code extension allowlist | Informational | /guides/vscode-extension-allowlist | Team policy workflow |
| VS Code extension approval process | Informational / commercial | /guides/vscode-extension-allowlist | Review record and enforcement distinction |
| VS Code extension security for teams | Commercial | /solutions/security-teams | Team evaluation page |
| VS Code extension release monitoring | Commercial | /monitor | Existing monitoring page |
| scan installed VS Code extensions | Informational / transactional | /cli | Installed-extension workflow |
| VS Code extension security MCP server | Informational / commercial | /docs/mcp | Assistant integration |

All demand and difficulty values remain unmeasured. Prioritization is based on product fit and the observed query meaning.

## Search-result observations

1. Scanner query: results mix source-code scanning tools with extension-package inspection. Make the analyzed object clear in the title, H1, introduction, and next action.
2. Safety query: results include identity/reputation checklists and Microsoft security documentation. Add reproducible artifact identity, coverage gaps, update review, and an original false-positive case, rather than repeating generic reputation advice.
3. VSIX query: results include local CLI tools and malware research. Explain downloaded-file inspection separately from installed inventory and published-release evidence. Do not invent tool commands.
4. Allowlist query: Microsoft's enterprise documentation is central. Explain evidence collection and decision ownership; link to Microsoft for actual enforcement configuration.
5. MCP query: results primarily explain adding servers or exposing editor tools. Keep the existing integration page focused on read-only extension evidence rather than broad MCP security promises.

Primary references: https://code.visualstudio.com/docs/configure/extensions/extension-runtime-security and https://code.visualstudio.com/docs/enterprise/extensions. Search examples also included https://safeguard.sh/resources/blog/how-to-vet-a-vs-code-extension-before-installing and https://github.com/PabloDomi/vsix-scan. This was not a full top-five page-by-page competitor audit; detailed competitor length/coverage comparisons remain outstanding.

## Implemented

- Guides hub with safety, local VSIX inspection, and team allowlist articles; clear headings, section navigation, human-readable server content, unique canonical and social metadata, Article and BreadcrumbList schema.
- Supporting guides link to relevant product flows, original research, and one another. Footer and primary scanner page make the cluster discoverable.
- A free downloadable CSV review-record template. It is not email-gated; the existing newsletter remains the opt-in capture mechanism.
- Scanner title, description, and H1 better express the target category and direct readers to exact-release evidence.
- Removed the root canonical and homepage Open Graph URL from inheritance; homepage keeps its explicit values. Existing per-page canonicals remain intact.
- Sitemap includes the guides, excludes the workspace, and no longer claims every URL was modified whenever generated. Add lastModified only when a reliable per-page content timestamp exists.
- Workspace has noindex metadata; this is a search directive, not access control.
- Existing llms.txt references the same human-facing guide hub. No separate AI-only content was created.

## Publication and measurement

After deployment, verify /guides, all three guide URLs, /templates/extension-security-review.csv, /sitemap.xml, and /robots.txt return the intended responses. Inspect rendered canonicals, schema, single H1s, mobile layout, and keyboard navigation. Verify the workspace noindex directive. Check broken links and indexability with a crawler; do not treat every crawler warning as a mandatory fix.

With a verified Search Console property, submit https://abscissa.dev/sitemap.xml and inspect the money page and guides. Record a baseline for page/query impressions, clicks, CTR, average position, and indexing. Compare weekly and 28-day windows; avoid conclusions from a few impressions. Measure registry use, completed scans, qualified signups, and team enquiries separately from search traffic. Event tracking should follow existing analytics consent behavior.

No Search Console or analytics account was available in this task. No verification token, tracking ID, ranking improvement, or performance baseline has been invented. Existing analytics was preserved.

## Promotion work queue

Use the existing Fabric8 false-positive case, immutable report methodology, and review template as reference assets. Pitch only evidence that can be reproduced; do not publish invented original statistics. Prepare a short expert quote on why advisory matches need package/version verification and offer the original case-study URL. Manually identify relevant journalist requests in Source of Sources or Featured once an account is available. Confirm the recipient and approve the exact message before sending. No outreach or journalist registrations have been performed.

## Next cycle

Week 1 after publication: verify indexing and crawlability; capture performance baseline; collect genuine user questions.
Week 2: validate the 15 candidate phrases in an available keyword tool and Search Console. Record country, language, date, volume estimate, difficulty estimate, SERP type, fit, and selected page. Inspect the top five organic pages for each priority query, taking notes on coverage and first-hand evidence.
Week 3: improve the first cluster using real scan examples and user questions; promote the template and original research through authorized channels.
Week 4: review relevant queries and conversions, identify overlap, and select the next cluster (release-change monitoring or assistant-assisted review). Sample a stable set of AI prompts with recorded model/date and citation URLs; responses are variable and do not establish universal visibility.
