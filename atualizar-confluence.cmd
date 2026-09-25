@echo off
REM atualizar-confluence.cmd — Atualiza painel no Confluence
REM Execute este arquivo quando quiser atualizar o Confluence manualmente

cd /d C:\Users\mtzcpd1276\sdprej-painel

echo.
echo ================================================================================
echo  🔄 ATUALIZANDO PAINEL SDPREJ NO CONFLUENCE
echo ================================================================================
echo.

echo ✓ Passo 1: Extraindo dados do Jira...
node extract/run.js
if %errorlevel% neq 0 (
    echo ❌ Erro na extração. Abortando.
    pause
    exit /b 1
)

echo.
echo ✓ Passo 2: Compilando painel...
node build.js
if %errorlevel% neq 0 (
    echo ❌ Erro na compilação. Abortando.
    pause
    exit /b 1
)

echo.
echo ✓ Passo 3: Gerando conteúdo premium para Confluence...
node generate-confluence-premium.js
if %errorlevel% neq 0 (
    echo ❌ Erro ao gerar conteúdo. Abortando.
    pause
    exit /b 1
)

echo.
echo ✓ Passo 4: Gerando documentação...
node generate-documentation-page.js
if %errorlevel% neq 0 (
    echo ❌ Erro ao gerar documentação. Abortando.
    pause
    exit /b 1
)

echo.
echo ✓ Passo 5: Publicando no Confluence...
node publish-confluence.js
if %errorlevel% neq 0 (
    echo ❌ Erro ao publicar. Abortando.
    pause
    exit /b 1
)

echo.
echo ✓ Passo 6: Publicando documentação...
node publish-documentation.js
if %errorlevel% neq 0 (
    echo ❌ Erro ao publicar documentação. Abortando.
    pause
    exit /b 1
)

echo.
echo ✓ Passo 7: Criando página do painel...
node create-painel-page.js
if %errorlevel% neq 0 (
    echo ❌ Erro ao criar página. Abortando.
    pause
    exit /b 1
)

echo.
echo ================================================================================
echo  ✅ SUCESSO! Confluence atualizado com dados mais recentes
echo ================================================================================
echo.
echo 🌐 Acesse: https://seu-confluence/wiki/spaces/...
echo 🕐 Próxima atualização automática: amanhã às 8:00 (GitHub Pages)
echo.
pause
