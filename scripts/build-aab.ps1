# Get Love Room: Google Play icin imzali App Bundle (.aab) uretir ve arsiv klasorune koyar.
# Play Console'a bu dosya yuklenir (Uretim / Dahili test). Imza: android\keystore.properties (depoda yok) = yukleme anahtari.
#
# Kullanim:  powershell -ExecutionPolicy Bypass -File scripts\build-aab.ps1
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$tools = Join-Path $env:USERPROFILE 'android-tools'
$env:JAVA_HOME = (Get-ChildItem $tools -Directory -Filter 'jdk-17*' | Select-Object -First 1).FullName
$env:ANDROID_HOME = Join-Path $tools 'sdk'
$gradle = Join-Path (Get-ChildItem $tools -Directory -Filter 'gradle-*' | Sort-Object { [version]($_.Name -replace 'gradle-', '') } -Descending | Select-Object -First 1).FullName 'bin\gradle.bat'
$android = Join-Path $root 'android'
Set-Content -Path (Join-Path $android 'local.properties') -Value ("sdk.dir=" + $env:ANDROID_HOME.Replace('\', '/')) -Encoding ascii
if (-not (Test-Path (Join-Path $android 'keystore.properties'))) { throw "android\keystore.properties yok: imzasiz paket Play'e yuklenemez" }

Push-Location $android
try { & $gradle --no-daemon -q bundleRelease; if ($LASTEXITCODE) { throw "Derleme basarisiz" } } finally { Pop-Location }

$ver = (Select-String -Path (Join-Path $android 'app\build.gradle') -Pattern "versionName '([^']+)'").Matches[0].Groups[1].Value
$aab = Join-Path $android 'app\build\outputs\bundle\release\app-release.aab'
$out = Join-Path (Split-Path -Parent $root) "arsiv\GetLoveRoom-$ver.aab"
Copy-Item $aab $out -Force
Write-Host "AAB: $out ($([math]::Round((Get-Item $out).Length / 1MB, 1)) MB)"
