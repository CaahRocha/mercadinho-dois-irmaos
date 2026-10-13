const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

const CashRegisterController = require('../controllers/cashRegister.controller');
const { authenticate, authorize, ROLES } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');

// Todas as rotas precisam de autenticação
router.use(authenticate);

// GET /api/cash-registers - Listar caixas (admin e manager veem todos)
router.get('/', CashRegisterController.getAll);

// GET /api/cash-registers/open - Listar caixas abertos
router.get('/open', CashRegisterController.getOpen);

// GET /api/cash-registers/my-open - Buscar caixa aberto do usuário
router.get('/my-open', CashRegisterController.getMyOpen);

// GET /api/cash-registers/:id - Buscar caixa por ID
router.get('/:id', CashRegisterController.getById);

// GET /api/cash-registers/:id/summary - Resumo do caixa
router.get('/:id/summary', CashRegisterController.getSummary);

// GET /api/cash-registers/:id/movements - Movimentações do caixa
router.get('/:id/movements', CashRegisterController.getMovements);

// POST /api/cash-registers/open - Abrir caixa
router.post('/open', [
  body('registerNumber')
    .isInt({ min: 1 }).withMessage('Número do caixa deve ser um inteiro positivo'),
  body('shift')
    .isIn([1, 2]).withMessage('Turno deve ser 1 ou 2'),
  body('openingAmount')
    .isFloat({ min: 0 }).withMessage('Valor de abertura deve ser positivo'),
  validate
], CashRegisterController.open);

// POST /api/cash-registers/:id/close - Fechar caixa
router.post('/:id/close', [
  body('closingAmount')
    .isFloat({ min: 0 }).withMessage('Valor de fechamento deve ser positivo'),
  validate
], CashRegisterController.close);

// POST /api/cash-registers/:id/withdrawal - Sangria (admin e manager)
router.post('/:id/withdrawal', [
  authorize(ROLES.ADMIN, ROLES.MANAGER),
  body('amount')
    .isFloat({ min: 0.01 }).withMessage('Valor deve ser positivo'),
  body('reason')
    .notEmpty().withMessage('Motivo é obrigatório'),
  validate
], CashRegisterController.withdrawal);

// POST /api/cash-registers/:id/deposit - Suprimento (admin e manager)
router.post('/:id/deposit', [
  authorize(ROLES.ADMIN, ROLES.MANAGER),
  body('amount')
    .isFloat({ min: 0.01 }).withMessage('Valor deve ser positivo'),
  body('reason')
    .notEmpty().withMessage('Motivo é obrigatório'),
  validate
], CashRegisterController.deposit);

module.exports = router;
