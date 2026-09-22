@echo off
rem ===========================================================================
rem  agendar.cmd — cria (ou recria) a tarefa diaria de atualizacao do painel.
rem
rem  Roda no contexto do usuario, sem privilegio de administrador. Por isso a
rem  tarefa so dispara quando o usuario esta logado — o que e aceitavel aqui:
rem  o painel e consumido durante o dia de trabalho.
rem
rem  Uso:  agendar.cmd            cria as 08:10
rem        agendar.cmd 07:30      cria no horario indicado
rem        agendar.cmd /remover   apaga a tarefa
rem ===========================================================================
setlocal
cd /d "%~dp0"

set "TAREFA=SDPREJ - atualizar painel"

if /i "%~1"=="/remover" (
  schtasks /Delete /TN "%TAREFA%" /F
  exit /b %errorlevel%
)

set "HORA=%~1"
if not defined HORA set "HORA=08:10"

rem /F recria se ja existir, para o script ser idempotente.
schtasks /Create /F ^
  /TN "%TAREFA%" ^
  /TR "\"%~dp0run-all.cmd\"" ^
  /SC DAILY ^
  /ST %HORA% ^
  /RL LIMITED

if errorlevel 1 (
  echo.
  echo Falha ao criar a tarefa.
  exit /b 1
)

echo.
echo Tarefa criada: "%TAREFA%", diaria as %HORA%.
echo.
echo   testar agora     schtasks /Run /TN "%TAREFA%"
echo   ver estado       schtasks /Query /TN "%TAREFA%" /V /FO LIST
echo   log              type "%~dp0data\run.log"
echo   remover          agendar.cmd /remover
exit /b 0
