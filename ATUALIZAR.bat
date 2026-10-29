@echo off
chcp 65001 >nul
title Atualizando Sistema Mercadinho

echo.
echo ══════════════════════════════════════════════
echo       ATUALIZANDO SISTEMA MERCADINHO
echo ══════════════════════════════════════════════
echo.

echo Baixando atualizacoes do GitHub...
git pull origin main

echo.
echo Atualizando dependencias do backend...
cd backend
call npm install

echo.
echo Atualizando dependencias do frontend...
cd ..\frontend
call npm install

cd ..

echo.
echo ══════════════════════════════════════════════
echo    ATUALIZADO COM SUCESSO!
echo ══════════════════════════════════════════════
echo.
echo Agora execute INICIAR.bat para rodar o sistema.
echo.
pause
