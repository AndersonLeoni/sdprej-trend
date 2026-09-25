@echo off
REM run-confluence-pipeline.cmd — orquestra a pipeline completa pra Confluence
REM Uso: run-confluence-pipeline.cmd
REM Ou agendado: schtasks /create /tn SDPREJ-Confluence /tr "C:\path\run-confluence-pipeline.cmd" /sc daily /st 09:00

setlocal enabledelayedexpansion

echo.
echo ========================================
echo  SDPREJ — Pipeline Confluence Visual
echo ========================================
echo.

REM Step 1: Extração de dados
echo [1/4] Extraindo dados do Jira...
call node extract/run.js
if %ERRORLEVEL% neq 0 (
  echo ❌ Erro na extração. Abortando.
  exit /b 1
)

REM Step 2: Build do painel
echo.
echo [2/4] Compilando painel HTML...
call node build.js
if %ERRORLEVEL% neq 0 (
  echo ❌ Erro no build. Abortando.
  exit /b 1
)

REM Step 3: Captura de screenshots
echo.
echo [3/4] Capturando screenshots dos gráficos...
call node generate-screenshots.js

REM Step 4: Gera HTML com imagens
echo.
echo [4/4] Montando conteúdo Confluence...
call node generate-confluence-com-imagens.js

REM Step 5: Upload de screenshots (opcional — comentado por enquanto)
REM echo.
REM echo [5/5] Upload de attachments para Confluence...
REM call node upload-screenshots.js
REM if %ERRORLEVEL% neq 0 (
REM   echo ⚠️  Upload falhou, mas o HTML foi gerado.
REM )

echo.
echo ✅ Pipeline concluído!
echo.
echo   Próximos passos:
echo   1. node upload-screenshots.js (fazer upload das imagens)
echo   2. node publish-confluence.js (publicar no Confluence)
echo.

endlocal
