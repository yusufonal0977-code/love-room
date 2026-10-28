@echo off
rem Love Room: sunucuyu ve web uygulamasini ayri pencerelerde baslatir.
cd /d "%~dp0"
if not exist node_modules (
  echo Ilk calistirma: paketler kuruluyor...
  call npm.cmd install
)
start "Love Room - Sunucu" cmd /k npm.cmd run server
start "Love Room - Uygulama" cmd /k npm.cmd run app
echo Tarayici birkac saniye icinde acilacak: http://localhost:8081
echo Ikinci kullanici icin ayni adresi yeni bir sekmede ac.
