const { getDb } = require('../database/connection');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

class UserModel {
  static get db() {
    return getDb();
  }

  /**
   * Buscar usuário por ID
   */
  static findById(id) {
    const stmt = this.db.prepare('SELECT * FROM users WHERE id = ?');
    return stmt.get(id);
  }

  /**
   * Buscar usuário por username
   */
  static findByUsername(username) {
    const stmt = this.db.prepare('SELECT * FROM users WHERE username = ?');
    return stmt.get(username);
  }

  /**
   * Listar todos os usuários (sem a senha)
   */
  static findAll(includeInactive = false) {
    let query = 'SELECT id, name, username, role, active, created_at FROM users';
    if (!includeInactive) {
      query += ' WHERE active = 1';
    }
    query += ' ORDER BY name';
    
    const stmt = this.db.prepare(query);
    return stmt.all();
  }

  /**
   * Criar novo usuário
   */
  static async create({ name, username, password, role }) {
    const hashedPassword = await bcrypt.hash(password, 10);
    const id = uuidv4();

    const stmt = this.db.prepare(`
      INSERT INTO users (id, name, username, password, role)
      VALUES (?, ?, ?, ?, ?)
    `);

    stmt.run(id, name, username, hashedPassword, role);
    return this.findById(id);
  }

  /**
   * Atualizar usuário
   */
  static async update(id, { name, username, password, role, active }) {
    const user = this.findById(id);
    if (!user) return null;

    let query = 'UPDATE users SET name = ?, username = ?, role = ?, active = ?, updated_at = CURRENT_TIMESTAMP';
    let params = [name || user.name, username || user.username, role || user.role, active !== undefined ? active : user.active];

    // Se uma nova senha foi fornecida, atualiza
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      query += ', password = ?';
      params.push(hashedPassword);
    }

    query += ' WHERE id = ?';
    params.push(id);

    const stmt = this.db.prepare(query);
    stmt.run(...params);

    return this.findById(id);
  }

  /**
   * Desativar usuário (soft delete)
   */
  static deactivate(id) {
    const stmt = this.db.prepare('UPDATE users SET active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
    return stmt.run(id);
  }

  /**
   * Verificar senha
   */
  static async verifyPassword(plainPassword, hashedPassword) {
    return bcrypt.compare(plainPassword, hashedPassword);
  }
}

module.exports = UserModel;
