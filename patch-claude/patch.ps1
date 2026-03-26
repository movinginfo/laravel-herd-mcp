#Requires -Version 5.1
<#
.SYNOPSIS
    Patches Herd's app.asar to add a "Claude Code" row in the Integrations tab.

.DESCRIPTION
    Extracts Herd's Electron app bundle, uses patch.js (Node.js) to modify the
    Integrations UI, repacks the bundle, then replaces it with admin rights.
    Re-run after every Herd update.

.NOTES
    Backup:  C:\Program Files\Herd\resources\app.asar.bak
    Requires: Node.js, PowerShell 5.1+, admin rights (UAC prompt)
#>

$ErrorActionPreference = 'Stop'

$herdAsar    = 'C:\Program Files\Herd\resources\app.asar'
$backupAsar  = 'C:\Program Files\Herd\resources\app.asar.bak'
$patchScript = Join-Path $PSScriptRoot 'patch.js'
$tmpDir      = Join-Path $env:TEMP ('herd-patch-' + [DateTimeOffset]::UtcNow.ToUnixTimeSeconds())
$tmpAsar     = Join-Path $env:TEMP ('app-patched-' + [DateTimeOffset]::UtcNow.ToUnixTimeSeconds() + '.asar')
$doneFile    = Join-Path $env:TEMP 'herd-patch-done.txt'
$errorFile   = Join-Path $env:TEMP 'herd-patch-error.txt'

# ── helpers ───────────────────────────────────────────────────────────────────
function Step([string]$msg)  { Write-Host "  $msg" -ForegroundColor Cyan }
function Ok([string]$msg)    { Write-Host "  OK  $msg" -ForegroundColor Green }
function Warn([string]$msg)  { Write-Host "  WARN $msg" -ForegroundColor Yellow }
function Abort([string]$msg) { Write-Host "`n  FAIL $msg`n" -ForegroundColor Red; exit 1 }

# ── banner ────────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "  laravel-herd-mcp -- Herd UI Patcher" -ForegroundColor DarkCyan
Write-Host "  Adds Claude Code row to Integrations tab" -ForegroundColor DarkCyan
Write-Host ""

# ── prereqs ───────────────────────────────────────────────────────────────────
Step "Checking prerequisites..."

if (-not (Test-Path $herdAsar)) {
    Abort "Herd not found at: $herdAsar"
}
if (-not (Test-Path $patchScript)) {
    Abort "patch.js not found at: $patchScript"
}

$nodeOk = $false
try { node --version 2>&1 | Out-Null; $nodeOk = $true } catch {}
if (-not $nodeOk) { Abort "Node.js not found. Download from https://nodejs.org" }

$asarOk = $false
try { npx --yes @electron/asar --version 2>&1 | Out-Null; $asarOk = $true } catch {}
if (-not $asarOk) { Abort "@electron/asar unavailable. Ensure Node.js is installed." }

$asarSize = [Math]::Round((Get-Item $herdAsar).Length / 1MB, 1)
Ok "Herd found ($asarSize MB)"

# ── extract ───────────────────────────────────────────────────────────────────
Step "Extracting app.asar..."
& npx @electron/asar extract $herdAsar $tmpDir 2>&1 | Out-Null
if (-not (Test-Path $tmpDir)) { Abort "Extraction failed" }
Ok "Extracted to temp directory"

# ── find settings JS ─────────────────────────────────────────────────────────
$assetsDir = Join-Path $tmpDir 'out\renderer\assets'
if (-not (Test-Path $assetsDir)) {
    Remove-Item $tmpDir -Recurse -Force -ErrorAction SilentlyContinue
    Abort "Renderer assets not found -- unexpected asar structure"
}

$jsFile = Get-ChildItem $assetsDir -Filter 'settings-*.js' | Select-Object -First 1
if (-not $jsFile) {
    Remove-Item $tmpDir -Recurse -Force -ErrorAction SilentlyContinue
    Abort "settings-*.js not found -- Herd version may have changed"
}
Ok "Found $($jsFile.Name)"

# ── apply patch via Node.js ───────────────────────────────────────────────────
Step "Patching renderer JS..."
$patchOut = & node $patchScript $jsFile.FullName 2>&1
$patchExit = $LASTEXITCODE

if ($patchExit -eq 2) {
    Warn "Already patched -- Claude Code row is already present"
    Remove-Item $tmpDir -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host ""
    Write-Host "  Restart Herd if you haven't already." -ForegroundColor Gray
    Write-Host ""
    exit 0
}
if ($patchExit -ne 0) {
    Remove-Item $tmpDir -Recurse -Force -ErrorAction SilentlyContinue
    switch ($patchOut) {
        'TARGET1_NOT_FOUND' { Abort "Patch target not found (Herd version changed). File a bug at https://github.com/movinginfo/laravel-herd-mcp" }
        'TARGET2_NOT_FOUND' { Abort "Patch target 2 not found. Herd version may have changed." }
        'TARGET3_NOT_FOUND' { Abort "Patch target 3 not found. Herd version may have changed." }
        default             { Abort "patch.js failed: $patchOut" }
    }
}
Ok $patchOut

# ── repack ────────────────────────────────────────────────────────────────────
Step "Repacking app.asar (may take ~30s)..."
& npx @electron/asar pack $tmpDir $tmpAsar 2>&1 | Out-Null
if (-not (Test-Path $tmpAsar)) {
    Remove-Item $tmpDir -Recurse -Force -ErrorAction SilentlyContinue
    Abort "Repack failed"
}
$newSize = [Math]::Round((Get-Item $tmpAsar).Length / 1MB, 1)
Ok "Repacked ($newSize MB)"

# ── write elevated helper script ─────────────────────────────────────────────
if (Test-Path $doneFile)  { Remove-Item $doneFile  -Force }
if (Test-Path $errorFile) { Remove-Item $errorFile -Force }

# Use single-quotes inside the heredoc to avoid variable expansion issues
$elevatedScript = @"
try {
    `$orig   = [string]'$($herdAsar.Replace('\','\\'))'
    `$backup = [string]'$($backupAsar.Replace('\','\\'))'
    `$src    = [string]'$($tmpAsar.Replace('\','\\'))'
    `$done   = [string]'$($doneFile.Replace('\','\\'))'
    `$err    = [string]'$($errorFile.Replace('\','\\'))'
    if (-not (Test-Path `$backup)) { Copy-Item `$orig `$backup -Force }
    Get-Process -Name Herd -ErrorAction SilentlyContinue | Stop-Process -Force
    Start-Sleep -Milliseconds 1500
    Copy-Item `$src `$orig -Force
    [System.IO.File]::WriteAllText(`$done, 'ok')
} catch {
    [System.IO.File]::WriteAllText(`$err, `$_.Exception.Message)
}
"@

$elevatedFile = Join-Path $env:TEMP 'herd-elevate.ps1'
Set-Content $elevatedFile -Value $elevatedScript -Encoding UTF8

# ── elevate ───────────────────────────────────────────────────────────────────
Step "Requesting admin rights to replace app.asar (UAC prompt)..."
Start-Process powershell -Verb RunAs -ArgumentList "-ExecutionPolicy Bypass -NonInteractive -File `"$elevatedFile`"" -Wait

if (Test-Path $errorFile) {
    $errMsg = Get-Content $errorFile -Raw
    Abort "Elevated step failed: $errMsg"
}
if (-not (Test-Path $doneFile)) {
    Abort "Elevated step did not complete -- UAC may have been cancelled"
}
Ok "app.asar replaced (backup: app.asar.bak)"

# ── cleanup ───────────────────────────────────────────────────────────────────
@($tmpDir, $tmpAsar, $elevatedFile, $doneFile, $errorFile) | ForEach-Object {
    Remove-Item $_ -Recurse -Force -ErrorAction SilentlyContinue
}

# ── restart Herd ─────────────────────────────────────────────────────────────
Step "Starting Herd..."
Start-Process 'C:\Program Files\Herd\Herd.exe'

Write-Host ""
Write-Host "  Patch complete!" -ForegroundColor Green
Write-Host "  Open Herd > Settings > Integrations to see Claude Code." -ForegroundColor Green
Write-Host "  Re-run this script after each Herd update." -ForegroundColor DarkGray
Write-Host ""
