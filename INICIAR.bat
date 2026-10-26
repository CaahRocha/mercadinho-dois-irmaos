@echo off
title Mercadinho Dois Irmaos
echo.
echo ========================================
echo    MERCADINHO DOIS IRMAOS
echo ========================================
echo.
echo Iniciando sistema...
echo.

cd /d "%~dp0backend"
start "" "http://localhost:3001"
node src/server.js

pause
