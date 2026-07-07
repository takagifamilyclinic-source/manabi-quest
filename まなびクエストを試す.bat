@echo off
rem manabi-quest local launcher (serves the app folder by absolute path)
cd /d "D:\Desktop-Archive\manabi-quest"
start "manabi-quest server - close this window to stop" python -m http.server 8420
timeout /t 2 /nobreak >nul
start "" "http://127.0.0.1:8420/"
