@echo off
rem ===========================================================================
rem  run-trend.cmd - extrai o APOIO Trend do Jira e monta dist\Trend_Painel.html
rem  Uso:  run-trend.cmd
rem ===========================================================================
setlocal
cd /d "%~dp0"

set "NODE="
for /f "delims=" %%i in ('where node.exe 2^>nul') do if not defined NODE set "NODE=%%i"
if not defined NODE if exist "%ProgramFiles%\nodejs\node.exe" set "NODE=%ProgramFiles%\nodejs\node.exe"
if not defined NODE (
  echo ERRO: node.exe nao encontrado no PATH nem em %ProgramFiles%\nodejs
  exit /b 9
)

"%NODE%" extract\trend.js
if errorlevel 1 (
  echo ERRO na extracao - painel anterior preservado
  exit /b 1
)
"%NODE%" build-trend.js
if errorlevel 1 exit /b 2
exit /b 0
