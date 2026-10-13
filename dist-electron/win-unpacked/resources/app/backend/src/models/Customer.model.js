const { getDb } = require('../database/connection');
const { v4: uuidv4 } = require('uuid');

class CustomerModel {
  static get db() {
    return getDb();
  }

  /**
   * Buscar cliente por ID
   */
  static findById(id) {
    const stmt = this.db.prepare('SELECT * FROM customers WHERE id = ?');
    return stmt.get(id);
  }

  /**
   * Buscar clientes por nome (busca parcial)
   */
  static searchByName(name) {
    const stmt = this.db.prepare(`
      SELECT * FROM customers 
      WHERE name LIKE ? AND active = 1 
      ORDER BY name
      LIMIT 20
    `);
    return stmt.all(`%${name}%`);
  }

  /**
   * Listar todos os clientes
   */
  static findAll({ active = true, withDebt = false } = {}) {
    let query = 'SELECT * FROM customers WHERE 1=1';
    const params = [];

    if (active !== null) {
      query += ' AND active = ?';
      params.push(active ? 1 : 0);
    }

    if (withDebt) {
      query += ' AND balance > 0';
    }

    query += ' ORDER BY name';

    const stmt = this.db.prepare(query);
    return stmt.all(...params);
  }

  /**
   * Buscar histórico do cliente (compras fiado e pagamentos)
   */
  static getHistory(customerId) {
    // Buscar vendas fiado do cliente
    const salesStmt = this.db.prepare(`
      SELECT s.*, u.name as user_name
      FROM sales s
      JOIN users u ON s.user_id = u.id
      WHERE s.customer_id = ? AND s.payment_method = 'fiado'
      ORDER BY s.created_at DESC
      LIMIT 50
    `);
    const sales = salesStmt.all(customerId);

    // Para cada venda, buscar os itens
    const itemsStmt = this.db.prepare(`
      SELECT si.*, p.name as product_name
      FROM sale_items si
      JOIN products p ON si.product_id = p.id
      WHERE si.sale_id = ?
    `);
    
    for (const sale of sales) {
      sale.items = itemsStmt.all(sale.id);
    }

    // Buscar pagamentos do cliente
    const paymentsStmt = this.db.prepare(`
      SELECT cp.*, u.name as user_name
      FROM customer_payments cp
      JOIN users u ON cp.user_id = u.id
      WHERE cp.customer_id = ?
      ORDER BY cp.created_at DESC
      LIMIT 50
    `);
    const payments = paymentsStmt.all(customerId);

    // Calcular sumário
    const summaryStmt = this.db.prepare(`
      SELECT 
        COALESCE(SUM(CASE WHEN status != 'cancelled' THEN total ELSE 0 END), 0) as totalPurchases,
        COUNT(CASE WHEN status != 'cancelled' THEN 1 END) as totalSales
      FROM sales 
      WHERE customer_id = ? AND payment_method = 'fiado'
    `);
    const purchaseSummary = summaryStmt.get(customerId);

    const paymentSummaryStmt = this.db.prepare(`
      SELECT 
        COALESCE(SUM(amount), 0) as totalPayments,
        COUNT(*) as totalPaymentCount
      FROM customer_payments 
      WHERE customer_id = ?
    `);
    const paymentSummary = paymentSummaryStmt.get(customerId);

    return { 
      sales, 
      payments,
      summary: {
        totalPurchases: purchaseSummary.totalPurchases || 0,
        totalSales: purchaseSummary.totalSales || 0,
        totalPayments: paymentSummary.totalPayments || 0,
        totalPaymentCount: paymentSummary.totalPaymentCount || 0
      }
    };
  }

  /**
   * Criar novo cliente
   */
  static create({ name, phone, document, credit_limit, address, neighborhood, city, whatsapp, notes }) {
    const id = uuidv4();

    const stmt = this.db.prepare(`
      INSERT INTO customers (id, name, phone, document, credit_limit, balance, address, neighborhood, city, whatsapp, notes)
      VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      name,
      phone || null,
      document || null,
      credit_limit || 0,
      address || null,
      neighborhood || null,
      city || null,
      whatsapp || null,
      notes || null
    );

    return this.findById(id);
  }

  /**
   * Atualizar cliente
   */
  static update(id, data) {
    const customer = this.findById(id);
    if (!customer) return null;

    const stmt = this.db.prepare(`
      UPDATE customers SET 
        name = ?,
        phone = ?,
        document = ?,
        credit_limit = ?,
        address = ?,
        neighborhood = ?,
        city = ?,
        whatsapp = ?,
        notes = ?,
        active = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    stmt.run(
      data.name || customer.name,
      data.phone !== undefined ? data.phone : customer.phone,
      data.document !== undefined ? data.document : customer.document,
      data.credit_limit !== undefined ? data.credit_limit : customer.credit_limit,
      data.address !== undefined ? data.address : customer.address,
      data.neighborhood !== undefined ? data.neighborhood : customer.neighborhood,
      data.city !== undefined ? data.city : customer.city,
      data.whatsapp !== undefined ? data.whatsapp : customer.whatsapp,
      data.notes !== undefined ? data.notes : customer.notes,
      data.active !== undefined ? (data.active ? 1 : 0) : customer.active,
      id
    );

    return this.findById(id);
  }

  /**
   * Adicionar débito ao cliente (quando faz compra fiado)
   */
  static addDebt(id, amount) {
    const customer = this.findById(id);
    if (!customer) return null;

    const newBalance = customer.balance + amount;

    const stmt = this.db.prepare(`
      UPDATE customers SET 
        balance = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    stmt.run(newBalance, id);

    return this.findById(id);
  }

  /**
   * Registrar pagamento de fiado
   */
  static registerPayment({ customer_id, user_id, amount, payment_method, notes }) {
    const id = uuidv4();

    // Registrar o pagamento
    const paymentStmt = this.db.prepare(`
      INSERT INTO customer_payments (id, customer_id, user_id, amount, payment_method, notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    paymentStmt.run(id, customer_id, user_id, amount, payment_method, notes || null);

    // Subtrair do saldo devedor
    const customer = this.findById(customer_id);
    const newBalance = Math.max(0, customer.balance - amount);

    const updateStmt = this.db.prepare(`
      UPDATE customers SET 
        balance = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    updateStmt.run(newBalance, customer_id);

    // Retornar o pagamento registrado
    const getPaymentStmt = this.db.prepare('SELECT * FROM customer_payments WHERE id = ?');
    return getPaymentStmt.get(id);
  }

  /**
   * Verificar se cliente pode comprar fiado (tem limite disponível)
   */
  static canBuyOnCredit(id, amount) {
    const customer = this.findById(id);
    if (!customer || !customer.active) return { allowed: false, reason: 'Cliente não encontrado ou inativo' };

    const availableCredit = customer.credit_limit - customer.balance;

    if (amount > availableCredit) {
      return { 
        allowed: false, 
        reason: `Limite insuficiente. Disponível: R$ ${availableCredit.toFixed(2)}`,
        available: availableCredit
      };
    }

    return { allowed: true, available: availableCredit };
  }

  /**
   * Desativar cliente (soft delete)
   */
  static deactivate(id) {
    const stmt = this.db.prepare('UPDATE customers SET active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
    return stmt.run(id);
  }

  /**
   * Buscar pagamentos de fiado por período
   */
  static getPaymentsByPeriod(startDate, endDate) {
    const stmt = this.db.prepare(`
      SELECT cp.*, c.name as customer_name, u.name as user_name
      FROM customer_payments cp
      JOIN customers c ON cp.customer_id = c.id
      JOIN users u ON cp.user_id = u.id
      WHERE DATE(cp.created_at) >= DATE(?) AND DATE(cp.created_at) <= DATE(?)
      ORDER BY cp.created_at DESC
    `);
    return stmt.all(startDate, endDate);
  }

  /**
   * Buscar pagamentos de fiado do dia
   */
  static getTodayPayments() {
    const stmt = this.db.prepare(`
      SELECT cp.*, c.name as customer_name, u.name as user_name
      FROM customer_payments cp
      JOIN customers c ON cp.customer_id = c.id
      JOIN users u ON cp.user_id = u.id
      WHERE DATE(cp.created_at) = DATE('now', 'localtime')
      ORDER BY cp.created_at DESC
    `);
    return stmt.all();
  }

  /**
   * Resumo de pagamentos de fiado do dia
   */
  static getTodayPaymentsSummary() {
    const stmt = this.db.prepare(`
      SELECT 
        COUNT(*) as count,
        COALESCE(SUM(amount), 0) as total,
        payment_method
      FROM customer_payments
      WHERE DATE(created_at) = DATE('now', 'localtime')
      GROUP BY payment_method
    `);
    const byMethod = stmt.all();

    const totalStmt = this.db.prepare(`
      SELECT 
        COUNT(*) as count,
        COALESCE(SUM(amount), 0) as total
      FROM customer_payments
      WHERE DATE(created_at) = DATE('now', 'localtime')
    `);
    const totals = totalStmt.get();

    return {
      byMethod,
      total: totals.total || 0,
      count: totals.count || 0
    };
  }
}

module.exports = CustomerModel;
