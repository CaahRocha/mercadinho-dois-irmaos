@echo off
title Mercadinho Dois Irmaos
echo.
echo ========================================
echo    MERCADINHO DOIS IRMAOS
echo ========================================
echo.

REM Mata qualquer processo antigo na porta 3001
echo Verificando porta 3001...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3001 ^| findstr LISTENING') do (
    taskkill /PID %%a /F >nul 2>&1
)

echo Iniciando servidor...
echo.

cd /d "%~dp0backend"

REM Define o ambiente como producao para servir o frontend
set NODE_ENV=production

REM Inicia o servidor
start /B node src/server.js

REM Espera 4 segundos para o servidor iniciar
echo Aguardando servidor iniciar...
timeout /t 4 /nobreak >nul

REM Abre o navegador
start "" "http://localhost:3001"

echo.
echo ========================================
echo    SISTEMA RODANDO!
echo    Acesse: http://localhost:3001
echo    NAO FECHE ESTA JANELA!
echo ========================================
echo.

REM Mantém a janela aberta
cmd /k
