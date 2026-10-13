const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

const CustomerController = require('../controllers/customer.controller');
const { authenticate, authorize, ROLES } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');

// Todas as rotas precisam de autenticação
router.use(authenticate);

// GET /api/customers - Listar clientes (todos podem ver para selecionar no PDV)
router.get('/', CustomerController.getAll);

// GET /api/customers/payments/today - Recebimentos de fiado do dia
router.get('/payments/today', CustomerController.getTodayPayments);

// GET /api/customers/search/:name - Buscar por nome
router.get('/search/:name', CustomerController.search);

// GET /api/customers/:id - Buscar por ID
router.get('/:id', CustomerController.getById);

// GET /api/customers/:id/history - Histórico de compras fiado do cliente
router.get('/:id/history', CustomerController.getHistory);

// POST /api/customers - Criar cliente (admin e manager)
router.post('/', [
  authorize(ROLES.ADMIN, ROLES.MANAGER),
  body('name').notEmpty().withMessage('Nome é obrigatório'),
  body('credit_limit')
    .optional()
    .isFloat({ min: 0 }).withMessage('Limite de crédito deve ser um valor positivo'),
  validate
], CustomerController.create);

// PUT /api/customers/:id - Atualizar cliente (admin e manager)
router.put('/:id', [
  authorize(ROLES.ADMIN, ROLES.MANAGER),
  body('credit_limit')
    .optional()
    .isFloat({ min: 0 }).withMessage('Limite de crédito deve ser um valor positivo'),
  validate
], CustomerController.update);

// POST /api/customers/:id/payment - Registrar pagamento de fiado (admin e manager)
router.post('/:id/payment', [
  authorize(ROLES.ADMIN, ROLES.MANAGER),
  body('amount')
    .isFloat({ min: 0.01 }).withMessage('Valor deve ser maior que zero'),
  body('payment_method')
    .isIn(['cash', 'credit', 'debit', 'pix'])
    .withMessage('Forma de pagamento inválida'),
  validate
], CustomerController.registerPayment);

// DELETE /api/customers/:id - Desativar cliente (admin e manager)
router.delete('/:id', authorize(ROLES.ADMIN, ROLES.MANAGER), CustomerController.delete);

module.exports = router;
