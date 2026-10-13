const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

const UserController = require('../controllers/user.controller');
const { authenticate, authorize, ROLES } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');

// Todas as rotas precisam de autenticação
router.use(authenticate);

// GET /api/users - Listar usuários (admin e manager)
router.get('/', authorize(ROLES.ADMIN, ROLES.MANAGER), UserController.getAll);

// GET /api/users/:id - Buscar usuário por ID
router.get('/:id', authorize(ROLES.ADMIN, ROLES.MANAGER), UserController.getById);

// POST /api/users - Criar usuário (somente admin)
router.post('/', [
  authorize(ROLES.ADMIN),
  body('name').notEmpty().withMessage('Nome é obrigatório'),
  body('username')
    .notEmpty().withMessage('Username é obrigatório')
    .isLength({ min: 3 }).withMessage('Username deve ter pelo menos 3 caracteres'),
  body('password')
    .isLength({ min: 6 }).withMessage('Senha deve ter pelo menos 6 caracteres'),
  body('role')
    .isIn(['admin', 'manager', 'cashier'])
    .withMessage('Role inválida. Use: admin, manager ou cashier'),
  validate
], UserController.create);

// PUT /api/users/:id - Atualizar usuário (somente admin)
router.put('/:id', [
  authorize(ROLES.ADMIN),
  body('username')
    .optional()
    .isLength({ min: 3 }).withMessage('Username deve ter pelo menos 3 caracteres'),
  body('password')
    .optional()
    .isLength({ min: 6 }).withMessage('Senha deve ter pelo menos 6 caracteres'),
  body('role')
    .optional()
    .isIn(['admin', 'manager', 'cashier'])
    .withMessage('Role inválida. Use: admin, manager ou cashier'),
  validate
], UserController.update);

// DELETE /api/users/:id - Desativar usuário (somente admin)
router.delete('/:id', authorize(ROLES.ADMIN), UserController.delete);

module.exports = router;
