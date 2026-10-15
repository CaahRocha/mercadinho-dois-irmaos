# Mercadinho Dois Irmãos

Sistema de PDV completo para mercados e mercearias.

## Funcionalidades

- PDV com código de barras
- Produtos por peso (balança)
- Sistema de Fiado (crédito para clientes)
- PIX com QR Code
- Controle de Caixa
- Gestão de Clientes
- Relatórios por E-mail
- Histórico de Vendas

## Instalação

### 1. Instalar Node.js
Baixe e instale o Node.js: https://nodejs.org (versão LTS)

### 2. Baixar o projeto
- Clique em **Code** → **Download ZIP**
- Extraia o ZIP em uma pasta

### 3. Instalar dependências
Abra o **Prompt de Comando** (CMD) na pasta do projeto e execute:

```
npm install
cd backend
npm install
cd ..
```

### 4. Iniciar o sistema
Dê **duplo clique** no arquivo `Iniciar-Sistema.vbs`

O sistema vai abrir automaticamente no Microsoft Edge.

## Usuários

Os usuários e senhas são configurados na primeira instalação.

## Configurar E-mail (Gmail)

Para enviar relatórios por e-mail:

1. Acesse **Configurações** → **E-mail**
2. Preencha:
   - Servidor SMTP: `smtp.gmail.com`
   - Porta: `587`
   - Usuário: seu email do Gmail
   - Senha: Senha de App do Google

### Como criar Senha de App do Google:
1. Acesse https://myaccount.google.com/apppasswords
2. Selecione "Email" e "Outro" (digite "Mercadinho")
3. Copie a senha de 16 caracteres gerada

## Tecnologias

- **Frontend:** React + Vite
- **Backend:** Node.js + Express
- **Banco de Dados:** SQLite (sql.js)

## Suporte

Desenvolvido para Mercadinho Dois Irmãos.
