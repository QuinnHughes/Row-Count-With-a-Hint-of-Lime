# Simple timestamped backup of data.json
$src = Join-Path $PSScriptRoot '..' 'server' 'data.json'
if (-Not (Test-Path $src)) { $src = Join-Path $PSScriptRoot '..' 'data.json' }
if (-Not (Test-Path $src)) { Write-Host 'No data.json found'; exit 0 }
$destDir = Join-Path $PSScriptRoot '..' 'backups'
New-Item -ItemType Directory -Force -Path $destDir | Out-Null
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$dest = Join-Path $destDir "data-$stamp.json"
Copy-Item $src $dest
Write-Host "Backup written to $dest"
