$ErrorActionPreference = "Stop"

$workspace = Join-Path ([System.IO.Path]::GetTempPath()) ("guardrails-collector-" + [guid]::NewGuid().ToString("N"))
try {
  New-Item -ItemType Directory -Path (Join-Path $workspace ".vscode") -Force | Out-Null
  New-Item -ItemType Directory -Path (Join-Path $workspace ".cursor") -Force | Out-Null
  New-Item -ItemType Directory -Path (Join-Path $workspace ".codex\skills\release-review") -Force | Out-Null
  @'
{
  // Keep this string intact while tolerating JSONC syntax.
  "recommendations": ["ms-python.python",],
  "note": ",]"
}
'@ | Set-Content -LiteralPath (Join-Path $workspace ".vscode\extensions.json") -Encoding UTF8
  @'
{
  "mcpServers": {
    "review": { "command": "node", "args": ["private-value",], },
  },
}
'@ | Set-Content -LiteralPath (Join-Path $workspace ".cursor\mcp.json") -Encoding UTF8
  "private skill instruction" | Set-Content -LiteralPath (Join-Path $workspace ".codex\skills\release-review\SKILL.md") -Encoding UTF8

  $script = Join-Path $PSScriptRoot "..\public\collect-ide-extensions.ps1"
  $graph = (& $script -WorkspaceCapabilityGraph -Workspace $workspace | ConvertFrom-Json -Depth 32)
  $subjects = @($graph.subjects)
  $python = $subjects | Where-Object { $_.id -eq "extension:ms-python.python" }
  $review = $subjects | Where-Object { $_.id -eq "mcp_server:review" }
  $skill = $subjects | Where-Object { $_.id -eq "agent_skill:codex-release-review" }
  if (-not $python -or -not $review -or -not $skill) { throw "Collector did not discover JSONC workspace declarations." }
  if ($review.capabilities -notcontains "process") { throw "Collector did not record the MCP process capability." }
  if (@($skill.capabilities).Count -ne 0) { throw "Collector inferred unobserved agent skill capabilities." }
  if (($graph | ConvertTo-Json -Depth 32) -match "private-value") { throw "Collector emitted an MCP argument." }
  if (($graph | ConvertTo-Json -Depth 32) -match "private skill instruction") { throw "Collector emitted a skill instruction." }
} finally {
  if (Test-Path -LiteralPath $workspace) { Remove-Item -LiteralPath $workspace -Recurse -Force }
}
