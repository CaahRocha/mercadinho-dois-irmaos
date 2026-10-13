const { getDb } = require('../database/connection');
const { v4: uuidv4 } = require('uuid');

class ProductModel {
  static get db() {
    return getDb();
  }

  /**
   * Buscar produto por ID
   */
  static findById(id) {
    const stmt = this.db.prepare('SELECT * FROM products WHERE id = ?');
    return stmt.get(id);
  }

  /**
   * Buscar produto por código de barras
   */
  static findByBarcode(barcode) {
    const stmt = this.db.prepare('SELECT * FROM products WHERE barcode = ? AND active = 1');
    return stmt.get(barcode);
  }

  /**
   * Buscar produtos por nome (busca parcial)
   */
  static searchByName(name) {
    const stmt = this.db.prepare(`
      SELECT * FROM products 
      WHERE name LIKE ? AND active = 1 
      ORDER BY name
      LIMIT 20
    `);
    return stmt.all(`%${name}%`);
  }

  /**
   * Listar todos os produtos
   */
  static findAll({ category, active = true, lowStock = false } = {}) {
    let query = 'SELECT * FROM products WHERE 1=1';
    const params = [];

    if (active !== null) {
      query += ' AND active = ?';
      params.push(active ? 1 : 0);
    }

    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }

    if (lowStock) {
      query += ' AND stock <= min_stock';
    }

    query += ' ORDER BY name';

    const stmt = this.db.prepare(query);
    return stmt.all(...params);
  }

  /**
   * Listar categorias
   */
  static getCategories() {
    const stmt = this.db.prepare('SELECT DISTINCT category FROM products WHERE category IS NOT NULL ORDER BY category');
    return stmt.all().map(row => row.category);
  }

  /**
   * Criar novo produto
   */
  static create({ barcode, name, description, category, price, cost_price, stock, min_stock, unit }) {
    const id = uuidv4();

    const stmt = this.db.prepare(`
      INSERT INTO products (id, barcode, name, description, category, price, cost_price, stock, min_stock, unit)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      barcode || null,
      name,
      description || null,
      category || null,
      price,
      cost_price || 0,
      stock || 0,
      min_stock || 5,
      unit || 'UN'
    );

    return this.findById(id);
  }

  /**
   * Atualizar produto
   */
  static update(id, data) {
    const product = this.findById(id);
    if (!product) return null;

    const stmt = this.db.prepare(`
      UPDATE products SET 
        barcode = ?,
        name = ?,
        description = ?,
        category = ?,
        price = ?,
        cost_price = ?,
        stock = ?,
        min_stock = ?,
        unit = ?,
        active = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    stmt.run(
      data.barcode !== undefined ? data.barcode : product.barcode,
      data.name || product.name,
      data.description !== undefined ? data.description : product.description,
      data.category !== undefined ? data.category : product.category,
      data.price !== undefined ? data.price : product.price,
      data.cost_price !== undefined ? data.cost_price : product.cost_price,
      data.stock !== undefined ? data.stock : product.stock,
      data.min_stock !== undefined ? data.min_stock : product.min_stock,
      data.unit || product.unit,
      data.active !== undefined ? (data.active ? 1 : 0) : product.active,
      id
    );

    return this.findById(id);
  }

  /**
   * Atualizar estoque
   */
  static updateStock(id, quantity, operation = 'subtract') {
    const product = this.findById(id);
    if (!product) return null;

    let newStock;
    if (operation === 'subtract') {
      newStock = product.stock - quantity;
    } else if (operation === 'add') {
      newStock = product.stock + quantity;
    } else {
      newStock = quantity; // set absolute value
    }

    const stmt = this.db.prepare('UPDATE products SET stock = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
    stmt.run(newStock, id);

    return this.findById(id);
  }

  /**
   * Desativar produto (soft delete)
   */
  static deactivate(id) {
    const stmt = this.db.prepare('UPDATE products SET active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
    return stmt.run(id);
  }
}

module.exports = ProductModel;
