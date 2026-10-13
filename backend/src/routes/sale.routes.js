const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

const SaleController = require('../controllers/sale.controller');
const { authenticate, authorize, ROLES } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');

// Todas as rotas precisam de autenticação
router.use(authenticate);

// GET /api/sales - Listar vendas
router.get('/', SaleController.getAll);

// GET /api/sales/today - Vendas do dia
router.get('/today', SaleController.getToday);

// GET /api/sales/top-products - Produtos mais vendidos
router.get('/top-products', SaleController.getTopProducts);

// GET /api/sales/:id - Buscar venda por ID
router.get('/:id', SaleController.getById);

// POST /api/sales - Criar venda
router.post('/', [
  body('items')
    .isArray({ min: 1 }).withMessage('Venda deve ter pelo menos um item'),
  body('items.*.product_id')
    .notEmpty().withMessage('ID do produto é obrigatório'),
  body('items.*.product_name')
    .notEmpty().withMessage('Nome do produto é obrigatório'),
  body('items.*.quantity')
    .isFloat({ min: 0.001 }).withMessage('Quantidade deve ser positiva'),
  body('items.*.unit_price')
    .isFloat({ min: 0 }).withMessage('Preço unitário deve ser positivo'),
  body('paymentMethod')
    .isIn(['cash', 'credit', 'debit', 'pix', 'fiado'])
    .withMessage('Forma de pagamento inválida'),
  body('paymentReceived')
    .optional()
    .isFloat({ min: 0 }).withMessage('Valor recebido deve ser positivo'),
  body('discount')
    .optional()
    .isFloat({ min: 0 }).withMessage('Desconto deve ser positivo'),
  validate
], SaleController.create);

// POST /api/sales/:id/cancel - Cancelar venda (admin e manager)
router.post('/:id/cancel', [
  authorize(ROLES.ADMIN, ROLES.MANAGER),
  body('reason')
    .notEmpty().withMessage('Motivo do cancelamento é obrigatório'),
  validate
], SaleController.cancel);

module.exports = router;
