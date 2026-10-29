@echo off
title Instalando Mercadinho Dois Irmaos
echo.
echo ========================================
echo    INSTALANDO MERCADINHO DOIS IRMAOS
echo ========================================
echo.
echo Isso pode demorar alguns minutos...
echo.

cd /d "%~dp0"

echo [1/2] Instalando dependencias do backend...
cd backend
call npm install
if errorlevel 1 (
    echo ERRO ao instalar backend!
    pause
    exit /b 1
)

echo.
echo [2/2] Instalando dependencias do frontend...
cd ..\frontend
call npm install
if errorlevel 1 (
    echo ERRO ao instalar frontend!
    pause
    exit /b 1
)

cd ..

echo.
echo ========================================
echo    INSTALACAO CONCLUIDA COM SUCESSO!
echo ========================================
echo.
echo Agora clique duas vezes no INICIAR.bat
echo.
pause
