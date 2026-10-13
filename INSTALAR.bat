@echo off
chcp 65001 >nul
title Mercadinho Dois Irmãos - Instalação

echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║         MERCADINHO DOIS IRMÃOS - INSTALAÇÃO                ║
echo ╚════════════════════════════════════════════════════════════╝
echo.

:: Verificar se Node.js está instalado
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERRO] Node.js não está instalado!
    echo.
    echo Por favor, instale o Node.js antes de continuar:
    echo.
    echo    1. Acesse: https://nodejs.org/
    echo    2. Baixe a versão LTS (recomendada)
    echo    3. Execute o instalador
    echo    4. Após instalar, execute este script novamente
    echo.
    pause
    exit /b 1
)

echo [OK] Node.js encontrado!
node -v
echo.

:: Instalar dependências do backend
echo [*] Instalando dependências do backend...
cd /d "%~dp0backend"
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo [ERRO] Falha ao instalar dependências do backend
    pause
    exit /b 1
)
echo [OK] Backend instalado!
echo.

:: Verificar se banco já existe
if not exist "%~dp0database\mercado.db" (
    echo [*] Criando banco de dados inicial...
    call npm run seed
    echo [OK] Banco de dados criado!
    echo.
)

:: Voltar para raiz
cd /d "%~dp0"

echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║              INSTALAÇÃO CONCLUÍDA!                         ║
echo ╠════════════════════════════════════════════════════════════╣
echo ║                                                            ║
echo ║  Para iniciar o sistema:                                   ║
echo ║                                                            ║
echo ║  1. Execute: iniciar-e-abrir.bat                           ║
echo ║                                                            ║
echo ║  2. Acesse: http://localhost:3001                          ║
echo ║                                                            ║
echo ║  Usuários de teste:                                        ║
echo ║    - admin / admin123 (Administrador)                      ║
echo ║    - gerente / gerente123 (Gerente)                        ║
echo ║    - caixa1 / caixa123 (Operador)                          ║
echo ║    - caixa2 / caixa123 (Operador)                          ║
echo ║                                                            ║
echo ╚════════════════════════════════════════════════════════════╝
echo.
pause
