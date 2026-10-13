const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

const ProductController = require('../controllers/product.controller');
const { authenticate, authorize, ROLES } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');

// Todas as rotas precisam de autenticação
router.use(authenticate);

// GET /api/products - Listar produtos (todos podem)
router.get('/', ProductController.getAll);

// GET /api/products/categories - Listar categorias
router.get('/categories', ProductController.getCategories);

// GET /api/products/search/:name - Buscar por nome
router.get('/search/:name', ProductController.search);

// GET /api/products/barcode/:barcode - Buscar por código de barras
router.get('/barcode/:barcode', ProductController.getByBarcode);

// GET /api/products/:id - Buscar por ID
router.get('/:id', ProductController.getById);

// POST /api/products - Criar produto (admin e manager)
router.post('/', [
  authorize(ROLES.ADMIN, ROLES.MANAGER),
  body('name').notEmpty().withMessage('Nome é obrigatório'),
  body('price')
    .isFloat({ min: 0 }).withMessage('Preço deve ser um valor positivo'),
  body('stock')
    .optional()
    .isInt({ min: 0 }).withMessage('Estoque deve ser um número inteiro positivo'),
  validate
], ProductController.create);

// PUT /api/products/:id - Atualizar produto (admin e manager)
router.put('/:id', [
  authorize(ROLES.ADMIN, ROLES.MANAGER),
  body('price')
    .optional()
    .isFloat({ min: 0 }).withMessage('Preço deve ser um valor positivo'),
  body('stock')
    .optional()
    .isInt({ min: 0 }).withMessage('Estoque deve ser um número inteiro positivo'),
  validate
], ProductController.update);

// PATCH /api/products/:id/stock - Atualizar estoque (admin e manager)
router.patch('/:id/stock', [
  authorize(ROLES.ADMIN, ROLES.MANAGER),
  body('quantity')
    .isFloat({ min: 0 }).withMessage('Quantidade deve ser um valor positivo'),
  body('operation')
    .isIn(['add', 'subtract', 'set'])
    .withMessage('Operação inválida. Use: add, subtract ou set'),
  validate
], ProductController.updateStock);

// DELETE /api/products/:id - Desativar produto (admin e manager)
router.delete('/:id', authorize(ROLES.ADMIN, ROLES.MANAGER), ProductController.delete);

module.exports = router;
