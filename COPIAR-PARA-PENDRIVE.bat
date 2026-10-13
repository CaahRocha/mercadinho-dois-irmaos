@echo off
chcp 65001 >nul
title Mercadinho Dois Irmãos - Copiar para Pendrive

echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║      COPIAR SISTEMA PARA PENDRIVE OU OUTRA PASTA           ║
echo ╚════════════════════════════════════════════════════════════╝
echo.

set /p DESTINO="Digite o caminho de destino (ex: E:\Sistema Mercado): "

if "%DESTINO%"=="" (
    echo [ERRO] Caminho não informado!
    pause
    exit /b 1
)

echo.
echo [*] Copiando arquivos para: %DESTINO%
echo     (Isso pode demorar alguns minutos...)
echo.

:: Criar pasta destino
mkdir "%DESTINO%" 2>nul

:: Copiar arquivos da raiz
copy "%~dp0*.bat" "%DESTINO%\" >nul
copy "%~dp0*.ps1" "%DESTINO%\" >nul
copy "%~dp0*.md" "%DESTINO%\" >nul
copy "%~dp0qrcode.jpg" "%DESTINO%\" 2>nul

:: Copiar backend (sem node_modules)
echo [*] Copiando backend...
xcopy "%~dp0backend" "%DESTINO%\backend\" /E /I /Y /EXCLUDE:%~dp0exclude.txt >nul

:: Copiar frontend dist
echo [*] Copiando frontend...
xcopy "%~dp0frontend\dist" "%DESTINO%\frontend\dist\" /E /I /Y >nul

:: Copiar database se existir
if exist "%~dp0database" (
    echo [*] Copiando banco de dados...
    xcopy "%~dp0database" "%DESTINO%\database\" /E /I /Y >nul
)

echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║                  CÓPIA CONCLUÍDA!                          ║
echo ╠════════════════════════════════════════════════════════════╣
echo ║                                                            ║
echo ║  Na máquina destino:                                       ║
echo ║                                                            ║
echo ║  1. Instale o Node.js (nodejs.org)                         ║
echo ║  2. Execute INSTALAR.bat                                   ║
echo ║  3. Execute iniciar-e-abrir.bat                            ║
echo ║                                                            ║
echo ╚════════════════════════════════════════════════════════════╝
echo.
pause
