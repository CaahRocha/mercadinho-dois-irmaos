const { getDb } = require('../database/connection');

class SettingsModel {
  static get db() {
    return getDb();
  }

  /**
   * Buscar configuração por chave
   */
  static get(key) {
    const stmt = this.db.prepare('SELECT value FROM settings WHERE key = ?');
    const result = stmt.get(key);
    return result ? result.value : null;
  }

  /**
   * Buscar todas as configurações
   */
  static getAll() {
    const stmt = this.db.prepare('SELECT * FROM settings');
    const results = stmt.all();
    
    // Converter para objeto
    const settings = {};
    for (const row of results) {
      try {
        settings[row.key] = JSON.parse(row.value);
      } catch {
        settings[row.key] = row.value;
      }
    }
    return settings;
  }

  /**
   * Salvar configuração
   */
  static set(key, value) {
    const valueStr = typeof value === 'object' ? JSON.stringify(value) : value;
    
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO settings (key, value, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
    `);
    
    stmt.run(key, valueStr);
    return this.get(key);
  }

  /**
   * Salvar múltiplas configurações
   */
  static setMultiple(settings) {
    for (const [key, value] of Object.entries(settings)) {
      this.set(key, value);
    }
    return this.getAll();
  }

  /**
   * Remover configuração
   */
  static delete(key) {
    const stmt = this.db.prepare('DELETE FROM settings WHERE key = ?');
    return stmt.run(key);
  }
}

module.exports = SettingsModel;
