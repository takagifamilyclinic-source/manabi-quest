@echo off
rem manabi-quest local launcher (ASCII only to avoid cmd mojibake)
cd /d "%~dp0"
start "manabi-quest server - close this window to stop" python -m http.server 8420
timeout /t 2 /nobreak >nul
start "" "http://127.0.0.1:8420/"
