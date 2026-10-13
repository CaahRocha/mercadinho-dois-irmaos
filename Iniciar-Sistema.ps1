# Mercadinho Dois Irmãos - Sistema PDV
# Script de inicialização

$Host.UI.RawUI.WindowTitle = "Mercadinho Dois Irmãos - Sistema PDV"

Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║         MERCADINHO DOIS IRMÃOS - SISTEMA PDV               ║" -ForegroundColor Cyan
Write-Host "║              Sempre pensando em você!                      ║" -ForegroundColor Yellow
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Definir diretório
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location "$ScriptDir\backend"

# Verificar se Node.js está instalado
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "[ERRO] Node.js não encontrado. Por favor, instale o Node.js." -ForegroundColor Red
    Write-Host "Download: https://nodejs.org/" -ForegroundColor Yellow
    Read-Host "Pressione Enter para sair"
    exit 1
}

# Verificar se as dependências estão instaladas
if (-not (Test-Path "node_modules")) {
    Write-Host "[*] Instalando dependências do backend..." -ForegroundColor Yellow
    npm install
}

# Configurar variáveis de ambiente
$env:NODE_ENV = "production"
$env:PORT = "3001"

Write-Host "[*] Iniciando servidor na porta 3001..." -ForegroundColor Green
Write-Host ""
Write-Host "    Acesse: http://localhost:3001" -ForegroundColor White
Write-Host ""
Write-Host "    Pressione Ctrl+C para parar o servidor" -ForegroundColor Gray
Write-Host ""

# Abrir navegador após 2 segundos
Start-Job -ScriptBlock {
    Start-Sleep -Seconds 2
    Start-Process "http://localhost:3001"
} | Out-Null

# Iniciar servidor
node src/server.js
