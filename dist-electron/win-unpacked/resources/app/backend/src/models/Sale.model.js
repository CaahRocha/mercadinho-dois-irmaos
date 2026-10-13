const { getDb } = require('../database/connection');
const { v4: uuidv4 } = require('uuid');
const ProductModel = require('./Product.model');

class SaleModel {
  static get db() {
    return getDb();
  }

  /**
   * Buscar venda por ID
   */
  static findById(id) {
    const stmt = this.db.prepare(`
      SELECT s.*, u.name as user_name
      FROM sales s
      JOIN users u ON s.user_id = u.id
      WHERE s.id = ?
    `);
    const sale = stmt.get(id);
    
    if (sale) {
      sale.items = this.getItems(id);
    }
    
    return sale;
  }

  /**
   * Listar vendas com filtros
   */
  static findAll({ cashRegisterId, userId, startDate, endDate, status } = {}) {
    let query = `
      SELECT s.*, u.name as user_name
      FROM sales s
      JOIN users u ON s.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (cashRegisterId) {
      query += ' AND s.cash_register_id = ?';
      params.push(cashRegisterId);
    }

    if (userId) {
      query += ' AND s.user_id = ?';
      params.push(userId);
    }

    if (startDate) {
      query += ' AND DATE(s.created_at) >= ?';
      params.push(startDate);
    }

    if (endDate) {
      query += ' AND DATE(s.created_at) <= ?';
      params.push(endDate);
    }

    if (status) {
      query += ' AND s.status = ?';
      params.push(status);
    }

    query += ' ORDER BY s.created_at DESC';

    const stmt = this.db.prepare(query);
    return stmt.all(...params);
  }

  /**
   * Buscar itens de uma venda
   */
  static getItems(saleId) {
    const stmt = this.db.prepare('SELECT * FROM sale_items WHERE sale_id = ?');
    return stmt.all(saleId);
  }

  /**
   * Criar nova venda
   */
  static create({ cashRegisterId, userId, customerId, items, discount = 0, paymentMethod, paymentReceived }) {
    // Calcular subtotal
    let subtotal = 0;
    for (const item of items) {
      subtotal += item.quantity * item.unit_price;
    }
    subtotal = Math.round(subtotal * 100) / 100;

    // Calcular total
    const total = Math.round((subtotal - discount) * 100) / 100;

    // Calcular troco (só para dinheiro)
    const changeAmount = paymentMethod === 'cash' 
      ? Math.round((paymentReceived - total) * 100) / 100 
      : 0;

    const saleId = uuidv4();

    // Inserir venda
    const saleStmt = this.db.prepare(`
      INSERT INTO sales (id, cash_register_id, user_id, customer_id, subtotal, discount, total, payment_method, payment_received, change_amount)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    saleStmt.run(saleId, cashRegisterId, userId, customerId || null, subtotal, discount, total, paymentMethod, paymentReceived || total, changeAmount);

    // Inserir itens e atualizar estoque
    const itemStmt = this.db.prepare(`
      INSERT INTO sale_items (id, sale_id, product_id, product_name, quantity, unit_price, subtotal)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    for (const item of items) {
      const itemSubtotal = Math.round(item.quantity * item.unit_price * 100) / 100;
      itemStmt.run(uuidv4(), saleId, item.product_id, item.product_name, item.quantity, item.unit_price, itemSubtotal);
      
      // Atualizar estoque
      ProductModel.updateStock(item.product_id, item.quantity, 'subtract');
    }

    return this.findById(saleId);
  }

  /**
   * Cancelar venda
   */
  static cancel(id, { reason, userId }) {
    const sale = this.findById(id);
    if (!sale) return null;
    if (sale.status === 'cancelled') {
      throw new Error('Venda já está cancelada');
    }

    // Atualizar status da venda
    const stmt = this.db.prepare(`
      UPDATE sales SET status = 'cancelled', cancelled_reason = ?
      WHERE id = ?
    `);
    stmt.run(reason, id);

    // Devolver itens ao estoque
    for (const item of sale.items) {
      ProductModel.updateStock(item.product_id, item.quantity, 'add');
    }

    return this.findById(id);
  }

  /**
   * Obter vendas do dia
   */
  static getTodaySales(cashRegisterId = null) {
    let query = `
      SELECT 
        COUNT(*) as total_sales,
        COALESCE(SUM(CASE WHEN status = 'completed' THEN total ELSE 0 END), 0) as total_value,
        COALESCE(SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END), 0) as cancelled_count
      FROM sales
      WHERE DATE(created_at) = DATE('now', 'localtime')
    `;
    const params = [];

    if (cashRegisterId) {
      query += ' AND cash_register_id = ?';
      params.push(cashRegisterId);
    }

    const stmt = this.db.prepare(query);
    return stmt.get(...params) || { total_sales: 0, total_value: 0, cancelled_count: 0 };
  }

  /**
   * Produtos mais vendidos
   */
  static getTopProducts(limit = 10, startDate = null, endDate = null) {
    let query = `
      SELECT 
        si.product_id,
        si.product_name,
        SUM(si.quantity) as total_quantity,
        SUM(si.subtotal) as total_value
      FROM sale_items si
      JOIN sales s ON si.sale_id = s.id
      WHERE s.status = 'completed'
    `;
    const params = [];

    if (startDate) {
      query += ' AND DATE(s.created_at) >= ?';
      params.push(startDate);
    }

    if (endDate) {
      query += ' AND DATE(s.created_at) <= ?';
      params.push(endDate);
    }

    query += `
      GROUP BY si.product_id, si.product_name
      ORDER BY total_quantity DESC
      LIMIT ?
    `;
    params.push(limit);

    const stmt = this.db.prepare(query);
    return stmt.all(...params);
  }

  /**
   * Buscar vendas por caixa
   */
  static findByCashRegister(cashRegisterId) {
    return this.findAll({ cashRegisterId });
  }
}

module.exports = SaleModel;
