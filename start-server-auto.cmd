@echo off
REM start-server-auto.cmd — Inicia servidor Node em background

cd /d C:\Users\mtzcpd1276\sdprej-painel
start /B node server.js >> C:\Users\mtzcpd1276\sdprej-painel\server.log 2>&1

echo ✅ Servidor iniciado em background
echo 🌐 http://10.213.12.91:8000/SDPREJ_Painel.html
