@echo off
rem ===========================================================================
rem  run-all.cmd - extrai do Jira, monta o painel, registra o que aconteceu.
rem
rem  E um .cmd, e nao um .ps1, por um motivo concreto: a politica de execucao
rem  efetiva desta maquina e Restricted por GPO de dominio (MachinePolicy), e
rem  arquivo .ps1 nao executa. O Agendador de Tarefas roda .cmd sem restricao.
rem
rem  Uso:  run-all.cmd            tudo
rem        run-all.cmd temas      so uma visao (a de changelog e a demorada)
rem ===========================================================================
setlocal

rem cd para a pasta do proprio script: a tarefa agendada comeca em C:\Windows\System32
cd /d "%~dp0"

set "LOG=%~dp0data\run.log"
if not exist "%~dp0data" mkdir "%~dp0data"

rem --- localizar o node ------------------------------------------------------
rem Procura no PATH primeiro; se nao achar, tenta o caminho padrao da instalacao.
rem Sem isto a tarefa agendada falha silenciosamente quando o PATH do contexto
rem de servico nao tem o node.
set "NODE="
for /f "delims=" %%i in ('where node.exe 2^>nul') do if not defined NODE set "NODE=%%i"
if not defined NODE if exist "%ProgramFiles%\nodejs\node.exe" set "NODE=%ProgramFiles%\nodejs\node.exe"
if not defined NODE (
  call :log "ERRO: node.exe nao encontrado no PATH nem em %ProgramFiles%\nodejs"
  exit /b 9
)

call :log "----- inicio  (node: %NODE%)"

rem --- extracao -------------------------------------------------------------
"%NODE%" extract\run.js %* >>"%LOG%" 2>&1
if errorlevel 1 (
  call :log "ERRO na extracao (codigo %errorlevel%) - painel anterior preservado"
  exit /b 1
)

rem --- build ----------------------------------------------------------------
rem So chega aqui se a extracao deu certo. Assim uma falha de rede nunca
rem substitui um painel bom por um painel vazio.
"%NODE%" build.js >>"%LOG%" 2>&1
if errorlevel 1 (
  call :log "ERRO no build (codigo %errorlevel%)"
  exit /b 2
)

rem --- conferencia ----------------------------------------------------------
rem Nao aborta nada: e um relatorio de sanidade sobre o que acabou de sair.
"%NODE%" verify.js >>"%LOG%" 2>&1

call :log "----- fim  ok"
exit /b 0

:log
echo [%DATE% %TIME%] %~1>>"%LOG%"
echo [%DATE% %TIME%] %~1
exit /b 0
