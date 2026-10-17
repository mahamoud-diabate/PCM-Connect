@echo off 
cd /d "%~dp0" 
set PORT=3011
node src\index.js > "%C:\Users\diaba\AppData\Local\Temp%\pcm-reel.log" 2>&1
