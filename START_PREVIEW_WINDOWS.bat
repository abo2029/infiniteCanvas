@echo off
setlocal
cd /d "%~dp0"

set "URL=http://127.0.0.1:4173/canvas"
set "HEALTH=http://127.0.0.1:4173/"

where py >nul 2>&1
if %errorlevel%==0 goto use_py

where python >nul 2>&1
if %errorlevel%==0 goto use_python

echo Python 3 is required to run the local preview.
echo Install Python 3, then run this file again.
pause
exit /b 1

:use_py
start "Infinite Canvas Preview Server" py -3 "%~dp0_preview_server.py"
goto wait_server

:use_python
start "Infinite Canvas Preview Server" python "%~dp0_preview_server.py"
goto wait_server

:wait_server
powershell -NoProfile -ExecutionPolicy Bypass -Command "$deadline=(Get-Date).AddSeconds(20); $ok=$false; while((Get-Date) -lt $deadline){ try { $r=Invoke-WebRequest -UseBasicParsing -Uri '%HEALTH%' -TimeoutSec 2; if($r.StatusCode -ge 200){$ok=$true; break} } catch {}; Start-Sleep -Milliseconds 250 }; if(-not $ok){ exit 1 }"
if errorlevel 1 (
  echo Infinite Canvas preview server failed to start.
  echo Please check the preview server window for details.
  pause
  exit /b 1
)

start "" "%URL%"
echo Infinite Canvas is running at: %URL%
echo Keep the preview server window open while testing.
exit /b 0
