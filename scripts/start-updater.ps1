param([switch]$InstallStartup,[switch]$NoOpen)
$projectPath = Split-Path -Parent $PSScriptRoot
$dataPath = Join-Path $projectPath '.local-data'
New-Item -ItemType Directory -Force -Path $dataPath | Out-Null
$nodePath = (Get-Command node -ErrorAction Stop).Source
$online = $false
try { $online = (Invoke-RestMethod 'http://127.0.0.1:5180/api/status' -TimeoutSec 2).app -eq 'draftlab-updater' } catch {}
if (-not $online) {
 Start-Process -FilePath $nodePath -ArgumentList ('"' + (Join-Path $PSScriptRoot 'updater.mjs') + '"') -WorkingDirectory $projectPath -WindowStyle Hidden -RedirectStandardOutput (Join-Path $dataPath 'updater.log') -RedirectStandardError (Join-Path $dataPath 'updater-error.log')
}
if ($InstallStartup) {
 $startupPath = [Environment]::GetFolderPath('Startup')
 $shortcut = (New-Object -ComObject WScript.Shell).CreateShortcut((Join-Path $startupPath 'Draftlab actualizador.lnk'))
 $shortcut.TargetPath = (Get-Command powershell.exe).Source
 $shortcut.Arguments = '-NoProfile -WindowStyle Hidden -File "' + $PSCommandPath + '" -NoOpen'
 $shortcut.WorkingDirectory = $projectPath
 $shortcut.WindowStyle = 7
 $shortcut.Save()
}
if (-not $NoOpen) { Start-Process 'http://127.0.0.1:5180/' }
Write-Output 'Draftlab: http://127.0.0.1:5180/'
