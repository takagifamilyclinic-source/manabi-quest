@echo off
rem まなびクエストをこのPCのブラウザで試す(ローカルサーバ起動)
cd /d "%~dp0"
start "" http://127.0.0.1:8420/
python -m http.server 8420
