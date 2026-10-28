require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

// Importar database para inicializar
const { dbPromise } = require('./database/connection');

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors());
app.use(express.json({ limit: '5mb' }));

// Log de requisições
app.use((req, res, next) => {
  const now = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  console.log(`${now} - ${req.method} ${req.url}`);
  next();
});

// Inicializar banco e depois configurar rotas
dbPromise.then(() => {
  // Importar rotas (depois que o banco está pronto)
  const authRoutes = require('./routes/auth.routes');
  const userRoutes = require('./routes/user.routes');
  const productRoutes = require('./routes/product.routes');
  const cashRegisterRoutes = require('./routes/cashRegister.routes');
  const saleRoutes = require('./routes/sale.routes');
  const customerRoutes = require('./routes/customer.routes');
  const settingsRoutes = require('./routes/settings.routes');

  // Rotas da API
  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/products', productRoutes);
  app.use('/api/cash-registers', cashRegisterRoutes);
  app.use('/api/sales', saleRoutes);
  app.use('/api/customers', customerRoutes);
  app.use('/api/settings', settingsRoutes);

  // Rota de health check
  app.get('/api/health', (req, res) => {
    res.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    });
  });

  // Servir frontend em produção
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, '../../frontend/dist')));
    
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, '../../frontend/dist/index.html'));
    });
  }

  // Tratamento de erros global
  app.use((err, req, res, next) => {
    console.error('Erro:', err);
    res.status(err.status || 500).json({
      error: true,
      message: err.message || 'Erro interno do servidor'
    });
  });

  // Iniciar servidor
  app.listen(PORT, () => {
    console.log(`
  ╔════════════════════════════════════════════╗
  ║         SISTEMA MERCADO - API              ║
  ╠════════════════════════════════════════════╣
  ║  Servidor rodando na porta ${PORT}            ║
  ║  http://localhost:${PORT}                     ║
  ╚════════════════════════════════════════════╝
    `);
  });
}).catch(err => {
  console.error('Erro ao inicializar banco de dados:', err);
  process.exit(1);
});

module.exports = app;
