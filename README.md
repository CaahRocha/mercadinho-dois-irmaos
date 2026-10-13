# Mercadinho Dois Irmãos - Sistema PDV

Sistema de Ponto de Venda (PDV) completo para mercadinhos.

---

## 📦 INSTALAÇÃO EM OUTRA MÁQUINA

### Passo 1: Instalar Node.js (apenas uma vez)

1. Acesse: **https://nodejs.org/**
2. Baixe a versão **LTS** (recomendada)
3. Execute o instalador e siga as instruções (Next, Next, Finish)
4. Reinicie o computador (opcional, mas recomendado)

### Passo 2: Copiar a pasta do sistema

Copie toda a pasta **"Sistema Mercado"** para o computador destino.

Pode ser via:
- Pendrive
- Rede
- OneDrive/Google Drive
- Compactado (.zip)

### Passo 3: Instalar dependências

1. Abra a pasta **"Sistema Mercado"**
2. Execute **`INSTALAR.bat`** (duplo clique)
3. Aguarde a instalação (pode demorar 1-2 minutos)

### Passo 4: Iniciar o sistema

1. Execute **`iniciar-e-abrir.bat`** (duplo clique)
2. O navegador abrirá automaticamente em http://localhost:3001

---

## 🚀 Como Usar (dia a dia)

Sempre que quiser usar o sistema:

1. Execute **`iniciar-e-abrir.bat`**
2. Aguarde o navegador abrir
3. Faça login

Para fechar: feche a janela preta do terminal (ou Ctrl+C)

---

## 🔐 Usuários de Teste

| Usuário | Senha | Perfil |
|---------|-------|--------|
| **admin** | admin123 | Administrador (Ederson) |
| **gerente** | gerente123 | Gerente (Nathaniel) |
| **caixa1** | caixa123 | Operador de Caixa |
| **caixa2** | caixa123 | Operador de Caixa |

---

## ✅ Funcionalidades

- PDV - Ponto de Venda
- Controle de Caixa (Abertura/Fechamento)
- Cadastro de Produtos
- Produtos por peso (balança)
- Sistema de Fiado (crédito para clientes)
- Histórico de Vendas
- Contas a Receber
- PIX com QR Code
- Relatório por e-mail no fechamento do caixa
- Gestão de Usuários
- Sangria e Suprimento
- Histórico de compras por cliente

---

## 📁 Estrutura de Arquivos

```
Sistema Mercado/
├── INSTALAR.bat         ← Execute primeiro (1x)
├── iniciar-e-abrir.bat  ← Execute para usar o sistema
├── iniciar.bat          ← Alternativa (sem abrir navegador)
├── README.md            ← Este arquivo
├── backend/             
│   ├── data/            ← Banco de dados (não apagar!)
│   └── ...
└── frontend/
    └── dist/            ← Interface compilada
```

---

## ⚠️ Importante

- **NÃO apague a pasta `backend/data/`** - ela contém todos os dados (vendas, produtos, clientes)
- Para fazer backup, copie a pasta `backend/data/`
- O sistema roda localmente na porta 3001

---

## 🛠️ Requisitos

- Windows 10 ou 11
- Node.js 18 ou superior
- Navegador moderno (Chrome, Edge, Firefox)

---

Desenvolvido para **Mercadinho Dois Irmãos** 🛒
