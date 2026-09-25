@echo off
REM start-server.cmd — Inicia servidor Node em background
REM Roda sempre que você loga no Windows

cd /d C:\Users\mtzcpd1276\sdprej-painel
start /B node server.js >> C:\Users\mtzcpd1276\sdprej-painel\server.log 2>&1

echo ✅ Servidor SDPREJ iniciado em background
echo 📡 http://localhost:8000/SDPREJ_Painel.html
