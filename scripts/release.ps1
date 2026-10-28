# Love Room - surum yayinlama
#
# Kullanim:  powershell -ExecutionPolicy Bypass -File scripts\release.ps1 -Version 0.4.0 -Notes "Yeni ozellikler..."
#
# Yaptiklari:
#   1. app/app.json ve package.json surumunu gunceller
#   2. Tum degisiklikleri commit eder, vX.Y.Z etiketi koyar, GitHub'a yukler
#   3. Bu surumun zip'ini proje disindaki ..\arsiv klasorune koyar (eski surumler orada birikir)
#   4. GitHub Releases'a surumu notlari ve zip ile birlikte ekler
param(
  [Parameter(Mandatory = $true)][string]$Version,
  [string]$Notes = ''
)
$ErrorActionPreference = 'Stop'

if ($Version -notmatch '^\d+\.\d+\.\d+$') { throw "Surum X.Y.Z biciminde olmali (ornek: 0.4.0)" }
$tag = "v$Version"
$root = Split-Path -Parent $PSScriptRoot
$archiveDir = Join-Path (Split-Path -Parent $root) 'arsiv'
$gh = 'C:\Program Files\GitHub CLI\gh.exe'

Set-Location $root
if (git tag --list $tag) { throw "$tag zaten var" }

# 1. Surum numaralari (dosya bicimini bozmadan, sadece "version" satirlari)
foreach ($file in @('app/app.json', 'package.json', 'app/package.json', 'server/package.json')) {
  $path = Join-Path $root $file
  if (-not (Test-Path $path)) { continue }
  $text = [IO.File]::ReadAllText($path)
  $text = [regex]::Replace($text, '("version"\s*:\s*")[^"]*(")', "`${1}$Version`${2}", 1)
  [IO.File]::WriteAllText($path, $text, (New-Object Text.UTF8Encoding $false))
}

# 2. Commit, etiket, GitHub
$msgFile = Join-Path $env:TEMP "loveroom-release-msg.txt"
$body = "Love Room $tag"
if ($Notes) { $body += "`n`n$Notes" }
$body += "`n`nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
[IO.File]::WriteAllText($msgFile, $body, (New-Object Text.UTF8Encoding $false))

git add -A
git commit -q -F $msgFile
git tag -a $tag -m "Love Room $tag"
git push -q origin HEAD --follow-tags

# 3. Arsiv
New-Item -ItemType Directory -Force $archiveDir | Out-Null
$date = Get-Date -Format 'yyyy-MM-dd'
$zip = Join-Path $archiveDir "love-room-$tag-$date.zip"
git archive --format zip --prefix "love-room/" -o $zip $tag

# 4. GitHub Releases
$notesFile = Join-Path $env:TEMP "loveroom-release-notes.txt"
$releaseNotes = if ($Notes) { $Notes } else { "Love Room $tag" }
[IO.File]::WriteAllText($notesFile, $releaseNotes, (New-Object Text.UTF8Encoding $false))
& $gh release create $tag $zip --title "Love Room $tag" --notes-file $notesFile | Out-Null

Write-Host "Yayinlandi: $tag"
Write-Host "Arsiv:      $zip"
