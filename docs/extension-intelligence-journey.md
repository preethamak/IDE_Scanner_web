# Extension intelligence journey

The Extension Registry is the public discovery surface. A profile is public documentation and release context; an Analysis Report is the security result for one version.

| Customer state | Route | Primary action | Destination |
| --- | --- | --- | --- |
| Search or browse | `/registry` | Open profile | `/extensions/[id]` |
| Unscanned version | `/extensions/[id]` or `/versions/[version]` | Deep Scan | Account sign-in, then the same release |
| Scan queued or running | Exact version page | View progress | The same page until a report is ready |
| Completed version | Profile or exact version page | Read Analysis Report | Immutable scan report when available |
| Reading documentation | Public profile | Read README | Inline README, or publisher documentation link |
| Watching updates | Profile or report | Watch releases | Account/workspace flow |

Public profiles, README content, version history, and completed public reports never require sign-in. Sign-in is requested only when a user starts a Deep Scan or enables monitoring.
