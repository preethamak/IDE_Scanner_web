# Local Workspace Collector

The local collector creates a bounded developer-capability graph from a
workspace without uploading source code, instruction text, command arguments,
environment variables, or secret values. Use it with the GuardRails workspace
capability inventory when a team wants evidence about declared tooling before
it decides whether that tooling can run.

## Start the local bridge

From the workspace you want to inspect, run:

```bash
python /path/to/collect-ide-extensions.py --serve --workspace .
```

The bridge listens only on `127.0.0.1:17865` by default. In GuardRails,
open the developer capability view and choose **Import local collector**. The
browser reads `http://127.0.0.1:17865/capability-graph` and sends the bounded
graph to the signed-in workspace API; the bridge never receives a GuardRails
credential.

For a preview before importing:

```bash
curl http://127.0.0.1:17865/capability-graph | jq .
```

## Windows

The PowerShell collector produces the same graph directly:

```powershell
./collect-ide-extensions.ps1 -WorkspaceCapabilityGraph -Workspace .
```

Use JSONC workspace files normally. Both collectors accept comments and
trailing commas in VS Code workspace declarations.

## Collected evidence

- Extension identifiers declared in `.vscode/extensions.json` and root
  `*.code-workspace` files.
- MCP server names and the conservative `tool`, `network`, or `process`
  capability inferred only from a declared URL or command.
- Agent-skill package identities found in `.codex/skills`, `.agents/skills`,
  and `.cursor/skills` when a direct child contains `SKILL.md`.

An agent-skill file proves only that the package was observed. The collector
does not read the instruction content and records no permissions for it. A
declared extension similarly remains observed evidence until a device
inventory records its installed version and artifact identity.

## Boundaries

The bridge permits browser reads from `https://abscissa.dev` and local
development at `http://localhost:3000`. Add an explicit additional origin only
when required:

```bash
python /path/to/collect-ide-extensions.py --serve --workspace . \
  --allowed-origin https://staging.example.com
```

`--allowed-origin` accepts only a bare `http` or `https` origin. It rejects
paths, query strings, fragments, and credentials. Keep the bridge on loopback
and stop it after importing the graph.
