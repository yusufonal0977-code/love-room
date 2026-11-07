# Get Love Room Android uygulamasi: APK derler ve GitHub'daki "android" surumune yukler (menudeki indirme linki buraya bakar).
#
# Kullanim:  powershell -ExecutionPolicy Bypass -File scripts\build-apk.ps1 [-NoUpload]
# Gerekenler: JDK 17 ve Android SDK (%USERPROFILE%\android-tools), imza bilgisi android\keystore.properties (depoda yok).
param([switch]$NoUpload)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$tools = Join-Path $env:USERPROFILE 'android-tools'
$env:JAVA_HOME = (Get-ChildItem $tools -Directory -Filter 'jdk-17*' | Select-Object -First 1).FullName
$env:ANDROID_HOME = Join-Path $tools 'sdk'
$gradle = Join-Path (Get-ChildItem $tools -Directory -Filter 'gradle-*' | Select-Object -First 1).FullName 'bin\gradle.bat'
$android = Join-Path $root 'android'
Set-Content -Path (Join-Path $android 'local.properties') -Value ("sdk.dir=" + $env:ANDROID_HOME.Replace('\', '/')) -Encoding ascii

Push-Location $android
try { & $gradle --no-daemon -q assembleRelease; if ($LASTEXITCODE) { throw "Derleme basarisiz" } } finally { Pop-Location }

$apk = Join-Path $android 'app\build\outputs\apk\release\app-release.apk'
$out = Join-Path (Split-Path -Parent $root) 'arsiv\GetLoveRoom.apk'
Copy-Item $apk $out -Force
Write-Host "APK: $out ($([math]::Round((Get-Item $out).Length / 1MB, 1)) MB)"

if (-not $NoUpload) {
  $gh = 'C:\Program Files\GitHub CLI\gh.exe'
  $exists = (& $gh release list --limit 50 | Select-String -SimpleMatch "android") -ne $null
  if (-not $exists) { & $gh release create android --title "Get Love Room Android" --notes "Android uygulamasi (widget'lar: ortak tuval, evcil dostumuz, iliski saatimiz). Siteden menu > Uygulamayi telefona indir." --latest=false | Out-Null }
  & $gh release upload android $out --clobber | Out-Null
  Write-Host "Yuklendi: https://github.com/yusufonal0977-code/love-room/releases/download/android/GetLoveRoom.apk"
}
