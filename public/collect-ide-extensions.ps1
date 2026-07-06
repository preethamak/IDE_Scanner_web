param(
  [Parameter(Mandatory=$true)]
  [string]$Server,
  [string]$Token = $env:IDE_SCANNER_AGENT_TOKEN
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
