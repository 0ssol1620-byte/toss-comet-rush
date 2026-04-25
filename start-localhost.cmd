@echo off
setlocal
cd /d "%~dp0"

echo.
echo Comet Rush local server
echo URL: http://localhost:4173/
echo Phone on same Wi-Fi: http://YOUR_PC_IPV4:4173/
echo.

where powershell >nul 2>nul
if %errorlevel%==0 (
  powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-localhost.ps1"
  if not %errorlevel%==0 pause
  exit /b %errorlevel%
)

cd /d "%~dp0dist"

where py >nul 2>nul
if %errorlevel%==0 (
  py -3 -m http.server 4173 --bind 0.0.0.0
  exit /b %errorlevel%
)

where python >nul 2>nul
if %errorlevel%==0 (
  python -m http.server 4173 --bind 0.0.0.0
  exit /b %errorlevel%
)

echo PowerShell and Python were not found on Windows.
echo Install Python or run this from WSL:
echo cd /mnt/c/Users/yspow/toss-comet-rush/dist ^&^& python3 -m http.server 4173 --bind 0.0.0.0
pause
