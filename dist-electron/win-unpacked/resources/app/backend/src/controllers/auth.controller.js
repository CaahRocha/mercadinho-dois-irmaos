const jwt = require('jsonwebtoken');
const UserModel = require('../models/User.model');

class AuthController {
  /**
   * Login do usuário
   * POST /api/auth/login
   */
  static async login(req, res) {
    try {
      const { username, password } = req.body;

      // Buscar usuário
      const user = UserModel.findByUsername(username);
      if (!user) {
        return res.status(401).json({
          error: true,
          message: 'Usuário ou senha inválidos'
        });
      }

      // Verificar se está ativo
      if (!user.active) {
        return res.status(401).json({
          error: true,
          message: 'Usuário desativado. Contate o administrador.'
        });
      }

      // Verificar senha
      const validPassword = await UserModel.verifyPassword(password, user.password);
      if (!validPassword) {
        return res.status(401).json({
          error: true,
          message: 'Usuário ou senha inválidos'
        });
      }

      // Gerar token JWT
      const token = jwt.sign(
        {
          id: user.id,
          username: user.username,
          name: user.name,
          role: user.role
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
      );

      res.json({
        user: {
          id: user.id,
          name: user.name,
          username: user.username,
          role: user.role
        },
        token
      });
    } catch (error) {
      console.error('Erro no login:', error);
      res.status(500).json({
        error: true,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Obter usuário atual
   * GET /api/auth/me
   */
  static async me(req, res) {
    try {
      const user = UserModel.findById(req.user.id);
      
      if (!user) {
        return res.status(404).json({
          error: true,
          message: 'Usuário não encontrado'
        });
      }

      res.json({
        id: user.id,
        name: user.name,
        username: user.username,
        role: user.role
      });
    } catch (error) {
      console.error('Erro ao buscar usuário:', error);
      res.status(500).json({
        error: true,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Alterar senha do próprio usuário
   * PUT /api/auth/change-password
   */
  static async changePassword(req, res) {
    try {
      const { currentPassword, newPassword } = req.body;
      const user = UserModel.findById(req.user.id);

      // Verificar senha atual
      const validPassword = await UserModel.verifyPassword(currentPassword, user.password);
      if (!validPassword) {
        return res.status(400).json({
          error: true,
          message: 'Senha atual incorreta'
        });
      }

      // Atualizar senha
      await UserModel.update(req.user.id, { password: newPassword });

      res.json({
        message: 'Senha alterada com sucesso'
      });
    } catch (error) {
      console.error('Erro ao alterar senha:', error);
      res.status(500).json({
        error: true,
        message: 'Erro interno do servidor'
      });
    }
  }
}

module.exports = AuthController;
