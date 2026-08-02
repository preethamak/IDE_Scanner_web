# Public navigation audit

| Route | Customer intent | Final behaviour | Decision |
| --- | --- | --- | --- |
| `/` | Find an extension | Search the Extension Registry | Keep |
| `/registry` | Browse or search extensions | Open public profiles | Keep |
| `/extensions/[id]` | Understand an extension | README, versions, scan summary | Keep |
| `/extensions/[id]/versions/[version]` | Read one version’s result | Analysis Report or request scan | Keep |
| `/analyze` | Check a local file | Upload VSIX or import report | Keep |
| `/monitor` | Follow future releases | Explain monitoring and open workspace | Keep |
| `/workspace` | Act on watched releases | Team review queue | Keep |
| `/catalog` | Old public search link | Redirect to `/registry` preserving query | Redirect |
| `/public-scan` | Old Registry link | Redirect to `/registry` | Redirect |
| `/inventory` | Old Registry link | Redirect to `/registry` | Redirect |
| `/scan` | Old file-analysis link | Redirect to `/analyze` | Redirect |
| `/history` | Imported reports | Imported-report history | Keep |
| `/diff` | [ASK USER] standalone comparison ownership | Do not promote in primary navigation | Review |
