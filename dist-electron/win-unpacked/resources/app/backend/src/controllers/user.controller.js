const UserModel = require('../models/User.model');

class UserController {
  /**
   * Listar todos os usuários
   * GET /api/users
   */
  static async getAll(req, res) {
    try {
      const { includeInactive } = req.query;
      const users = UserModel.findAll(includeInactive === 'true');

      res.json(users);
    } catch (error) {
      console.error('Erro ao listar usuários:', error);
      res.status(500).json({
        error: true,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Buscar usuário por ID
   * GET /api/users/:id
   */
  static async getById(req, res) {
    try {
      const user = UserModel.findById(req.params.id);

      if (!user) {
        return res.status(404).json({
          error: true,
          message: 'Usuário não encontrado'
        });
      }

      // Remover senha do retorno
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error('Erro ao buscar usuário:', error);
      res.status(500).json({
        error: true,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Criar novo usuário
   * POST /api/users
   */
  static async create(req, res) {
    try {
      const { name, username, password, role } = req.body;

      // Verificar se username já existe
      const existing = UserModel.findByUsername(username);
      if (existing) {
        return res.status(400).json({
          error: true,
          message: 'Nome de usuário já existe'
        });
      }

      const user = await UserModel.create({ name, username, password, role });
      
      // Remover senha do retorno
      const { password: _, ...userWithoutPassword } = user;
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      console.error('Erro ao criar usuário:', error);
      res.status(500).json({
        error: true,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Atualizar usuário
   * PUT /api/users/:id
   */
  static async update(req, res) {
    try {
      const { name, username, password, role, active } = req.body;

      // Verificar se username já existe para outro usuário
      if (username) {
        const existing = UserModel.findByUsername(username);
        if (existing && existing.id !== req.params.id) {
          return res.status(400).json({
            error: true,
            message: 'Nome de usuário já existe'
          });
        }
      }

      const user = await UserModel.update(req.params.id, { name, username, password, role, active });

      if (!user) {
        return res.status(404).json({
          error: true,
          message: 'Usuário não encontrado'
        });
      }

      // Remover senha do retorno
      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error('Erro ao atualizar usuário:', error);
      res.status(500).json({
        error: true,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Desativar usuário
   * DELETE /api/users/:id
   */
  static async delete(req, res) {
    try {
      // Não permitir desativar a si mesmo
      if (req.params.id === req.user.id) {
        return res.status(400).json({
          error: true,
          message: 'Você não pode desativar sua própria conta'
        });
      }

      const result = UserModel.deactivate(req.params.id);

      if (result.changes === 0) {
        return res.status(404).json({
          error: true,
          message: 'Usuário não encontrado'
        });
      }

      res.json({
        message: 'Usuário desativado com sucesso'
      });
    } catch (error) {
      console.error('Erro ao desativar usuário:', error);
      res.status(500).json({
        error: true,
        message: 'Erro interno do servidor'
      });
    }
  }
}

module.exports = UserController;
