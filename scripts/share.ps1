# Love Room - arkadaslarla paylasilabilir link (Cloudflare Quick Tunnel)
#
# 1. Web surumunu derler (app/dist)
# 2. Sunucuyu yeni bir pencerede baslatir; web uygulamasini da ayni adresten sunar
# 3. Cloudflare tuneli acar ve https://....trycloudflare.com linkini yazar + panoya kopyalar
#
# Link, bu bilgisayar ve acilan iki pencere acik oldugu surece calisir. Her calistirmada link degisir.
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root
$env:Path = "C:\Program Files\nodejs;$env:Path"

$cloudflared = @('C:\Program Files (x86)\cloudflared\cloudflared.exe', 'C:\Program Files\cloudflared\cloudflared.exe') |
  Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $cloudflared) { throw 'cloudflared bulunamadi. Kurulum: winget install --id Cloudflare.cloudflared' }

if (-not (Test-Path node_modules)) {
  Write-Host 'Ilk calistirma: paketler kuruluyor...'
  npm.cmd install
}

Write-Host 'Web surumu derleniyor (1-2 dakika surebilir)...'
npm.cmd run build:web
if ($LASTEXITCODE -ne 0) { throw 'Web derlemesi basarisiz' }

# 4000 portunda calisan eski sunucu varsa kapat (derleme sonrasi yeniden baslamali).
Get-NetTCPConnection -LocalPort 4000 -State Listen -ErrorAction SilentlyContinue |
  ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }

Start-Process cmd -ArgumentList '/k', 'title Love Room - Sunucu && npm.cmd run start' -WorkingDirectory $root

$log = Join-Path $env:TEMP 'loveroom-tunnel.log'
Remove-Item $log -ErrorAction SilentlyContinue
Start-Process $cloudflared -ArgumentList 'tunnel', '--no-autoupdate', '--url', 'http://localhost:4000', '--logfile', "`"$log`""

Write-Host 'Tunel aciliyor...'
$url = $null
for ($i = 0; $i -lt 60 -and -not $url; $i++) {
  Start-Sleep -Seconds 1
  if (Test-Path $log) {
    $m = Select-String -Path $log -Pattern 'https://[a-z0-9-]+\.trycloudflare\.com' | Select-Object -First 1
    if ($m) { $url = $m.Matches[0].Value }
  }
}
if (-not $url) { throw "Tunel linki alinamadi. Kayit: $log" }

Set-Clipboard -Value $url
Write-Host ''
Write-Host '============================================================'
Write-Host "  Love Room linki:  $url"
Write-Host '  (panoya kopyalandi - arkadaslarina gonderebilirsin)'
Write-Host '============================================================'
Write-Host 'Bu bilgisayar ve acilan pencereler acik kaldikca link calisir.'
