@echo off
chcp 65001 >nul
title Mercadinho Dois Irmãos - Sistema PDV

echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║         MERCADINHO DOIS IRMÃOS - SISTEMA PDV               ║
echo ║                    Iniciando...                            ║
echo ╚════════════════════════════════════════════════════════════╝
echo.

cd /d "%~dp0backend"

echo [*] Iniciando servidor...
echo.

set NODE_ENV=production
set PORT=3001

node src/server.js

pause
