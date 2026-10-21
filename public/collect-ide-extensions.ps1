param(
  [string]$Server,
  [string]$Token = $env:IDE_SCANNER_AGENT_TOKEN,
  [switch]$WorkspaceCapabilityGraph,
  [string]$Workspace = (Get-Location).Path
)

$ErrorActionPreference = "Stop"

function Add-Root {
  param([System.Collections.ArrayList]$Roots, [string]$Client, [string]$Path)
  if ($Path -and (Test-Path -LiteralPath $Path -PathType Container)) {
    [void]$Roots.Add([pscustomobject]@{ client = $Client; path = $Path })
  }
}

function Limit-Text {
  param($Value, [int]$Limit = 120)
  if ($null -eq $Value -or -not ($Value -is [string])) { return "" }
  $clean = ($Value -replace "\s+", " ").Trim()
  if ($clean.Length -gt $Limit) { return $clean.Substring(0, $Limit) }
  return $clean
}

function Compact-Manifest {
  param($Manifest)
  $scripts = @{}
  if ($Manifest.scripts) {
    foreach ($name in @("preinstall", "install", "postinstall")) {
      if ($Manifest.scripts.$name -is [string]) {
        $scripts[$name] = Limit-Text $Manifest.scripts.$name 180
      }
    }
  }

  $activation = @()
  if ($Manifest.activationEvents) {
    foreach ($event in $Manifest.activationEvents) {
      if (($event -eq "*") -or ($event -eq "onStartupFinished")) {
        $activation += $event
      }
    }
  }

  return [pscustomobject]@{
    publisher = Limit-Text $Manifest.publisher
    name = Limit-Text $Manifest.name
    displayName = Limit-Text $Manifest.displayName
    version = Limit-Text $Manifest.version
    description = Limit-Text $Manifest.description 280
    activationEvents = $activation | Select-Object -First 8
    scripts = $scripts
  }
}

function Read-WorkspaceJson {
  param([string]$Path)
  if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) { return $null }
  try {
    if ((Get-Item -LiteralPath $Path).Length -gt 512000) { return $null }
    return Get-Content -LiteralPath $Path -Raw -Encoding UTF8 | ConvertFrom-Json -Depth 32
  } catch { return $null }
}

function Add-CapabilitySubject {
  param([System.Collections.ArrayList]$Subjects, [hashtable]$Seen, [string]$Id, [string]$Kind, [string]$Name, [string[]]$Capabilities, [string]$ObservedAt)
  if ($Seen.ContainsKey($Id)) { return }
  $Seen[$Id] = $true
  [void]$Subjects.Add([pscustomobject]@{ id=$Id; kind=$Kind; name=$Name; version=$null; publisher=$null; artifactSha256=$null; evidenceState="observed"; observedAt=$ObservedAt; capabilities=$Capabilities; source="collector" })
}

function Get-WorkspaceCapabilityGraph {
  param([string]$Root)
  $resolved = (Resolve-Path -LiteralPath $Root).Path
  $observedAt = [DateTime]::UtcNow.ToString("o")
  $subjects = [System.Collections.ArrayList]::new(); $seen = @{}
  $extensionFiles = @((Join-Path $resolved ".vscode\extensions.json")) + @(Get-ChildItem -LiteralPath $resolved -Filter "*.code-workspace" -File -ErrorAction SilentlyContinue | Select-Object -ExpandProperty FullName)
  foreach ($file in $extensionFiles) {
    $config = Read-WorkspaceJson $file
    $ids = @($config.recommendations)
    if ($config.customizations.vscode.extensions) { $ids += @($config.customizations.vscode.extensions) }
    foreach ($id in $ids) {
      if ($id -is [string] -and $id -match '^[A-Za-z0-9_-]+\.[A-Za-z0-9_.-]+$') {
        Add-CapabilitySubject $subjects $seen ("extension:" + $id.ToLower()) "extension" $id @("editor") $observedAt
      }
    }
  }
  foreach ($file in @((Join-Path $resolved ".vscode\mcp.json"), (Join-Path $resolved ".cursor\mcp.json"), (Join-Path $resolved ".mcp.json"))) {
    $config = Read-WorkspaceJson $file
    if ($config.mcpServers) { foreach ($property in $config.mcpServers.psobject.Properties) {
      $safe = ($property.Name.ToLower() -replace '[^a-z0-9._-]', '-').Trim('.','-')
      if (-not $safe) { continue }
      $capabilities = @("tool")
      if ($property.Value.url -is [string]) { $capabilities += "network" }
      if ($property.Value.command -is [string]) { $capabilities += "process" }
      Add-CapabilitySubject $subjects $seen ("mcp_server:" + $safe) "mcp_server" $property.Name $capabilities $observedAt
    } }
  }
  return [pscustomobject]@{ generatedAt=$observedAt; subjects=$subjects | Select-Object -First 500; relationships=@() }
}

if ($WorkspaceCapabilityGraph) {
  (Get-WorkspaceCapabilityGraph $Workspace) | ConvertTo-Json -Depth 32
  exit 0
}
if (-not $Server) { throw "-Server is required unless -WorkspaceCapabilityGraph is used." }

$roots = [System.Collections.ArrayList]::new()
$homeDir = [Environment]::GetFolderPath("UserProfile")
$appData = $env:APPDATA

Add-Root $roots "vscode" (Join-Path $homeDir ".vscode\extensions")
Add-Root $roots "vscode-insiders" (Join-Path $homeDir ".vscode-insiders\extensions")
Add-Root $roots "vscodium" (Join-Path $homeDir ".vscodium\extensions")
Add-Root $roots "cursor" (Join-Path $homeDir ".cursor\extensions")
Add-Root $roots "windsurf" (Join-Path $homeDir ".windsurf\extensions")

if ($appData) {
  Add-Root $roots "vscode" (Join-Path $appData "Code\extensions")
  Add-Root $roots "vscode-insiders" (Join-Path $appData "Code - Insiders\extensions")
  Add-Root $roots "vscodium" (Join-Path $appData "VSCodium\extensions")
  Add-Root $roots "cursor" (Join-Path $appData "Cursor\extensions")
  Add-Root $roots "windsurf" (Join-Path $appData "Windsurf\extensions")
}

$seen = @{}
$extensions = [System.Collections.ArrayList]::new()
foreach ($root in $roots) {
  Get-ChildItem -LiteralPath $root.path -Directory -ErrorAction SilentlyContinue | ForEach-Object {
    $packagePath = Join-Path $_.FullName "package.json"
    if (-not (Test-Path -LiteralPath $packagePath -PathType Leaf)) { return }
    if ($seen.ContainsKey($_.FullName)) { return }
    try {
      $manifest = Get-Content -LiteralPath $packagePath -Raw -Encoding UTF8 | ConvertFrom-Json -Depth 100
    } catch {
      return
    }
    $seen[$_.FullName] = $true
    [void]$extensions.Add([pscustomobject]@{
      client = $root.client
      path = $_.FullName
      manifest = Compact-Manifest $manifest
    })
  }
}

$payload = [pscustomobject]@{
  agent = [pscustomobject]@{
    schema_version = "0.1.0"
    generated_at = [int64](([DateTimeOffset]::UtcNow).ToUnixTimeMilliseconds())
    hostname = [System.Net.Dns]::GetHostName()
    platform = "Windows"
    platform_release = [Environment]::OSVersion.VersionString
    machine = $env:PROCESSOR_ARCHITECTURE
    python = ""
  }
  extensions = $extensions
}

$headers = @{ "Content-Type" = "application/json"; "User-Agent" = "ide-scanner-lightweight-collector/0.1.0" }
if ($Token) {
  $headers["Authorization"] = "Bearer $Token"
}

$endpoint = ($Server.TrimEnd("/")) + "/api/collector/reports"
$body = $payload | ConvertTo-Json -Depth 100
$result = Invoke-RestMethod -Method Post -Uri $endpoint -Headers $headers -Body $body
$result | ConvertTo-Json -Depth 100
