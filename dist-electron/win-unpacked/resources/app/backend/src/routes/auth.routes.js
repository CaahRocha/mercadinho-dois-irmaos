const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

const AuthController = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');

// POST /api/auth/login - Login
router.post('/login', [
  body('username').notEmpty().withMessage('Username é obrigatório'),
  body('password').notEmpty().withMessage('Senha é obrigatória'),
  validate
], AuthController.login);

// GET /api/auth/me - Usuário logado (precisa estar autenticado)
router.get('/me', authenticate, AuthController.me);

// PUT /api/auth/change-password - Alterar senha
router.put('/change-password', [
  authenticate,
  body('currentPassword').notEmpty().withMessage('Senha atual é obrigatória'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('Nova senha deve ter pelo menos 6 caracteres'),
  validate
], AuthController.changePassword);

module.exports = router;
