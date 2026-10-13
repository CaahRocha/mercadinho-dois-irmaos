const { getDb } = require('../database/connection');
const { v4: uuidv4 } = require('uuid');

class CashRegisterModel {
  static get db() {
    return getDb();
  }

  /**
   * Buscar caixa por ID
   */
  static findById(id) {
    const stmt = this.db.prepare(`
      SELECT cr.*, u.name as user_name
      FROM cash_registers cr
      JOIN users u ON cr.user_id = u.id
      WHERE cr.id = ?
    `);
    return stmt.get(id);
  }

  /**
   * Buscar caixa aberto do usuário
   */
  static findOpenByUser(userId) {
    const stmt = this.db.prepare(`
      SELECT * FROM cash_registers 
      WHERE user_id = ? AND status = 'open'
    `);
    return stmt.get(userId);
  }

  /**
   * Buscar caixa aberto por número do caixa
   */
  static findOpenByRegisterNumber(registerNumber) {
    const stmt = this.db.prepare(`
      SELECT cr.*, u.name as user_name
      FROM cash_registers cr
      JOIN users u ON cr.user_id = u.id
      WHERE cr.register_number = ? AND cr.status = 'open'
    `);
    return stmt.get(registerNumber);
  }

  /**
   * Listar caixas com filtros
   */
  static findAll({ status, date, registerNumber } = {}) {
    let query = `
      SELECT cr.*, u.name as user_name
      FROM cash_registers cr
      JOIN users u ON cr.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      query += ' AND cr.status = ?';
      params.push(status);
    }

    if (date) {
      query += ' AND DATE(cr.opened_at) = ?';
      params.push(date);
    }

    if (registerNumber) {
      query += ' AND cr.register_number = ?';
      params.push(registerNumber);
    }

    query += ' ORDER BY cr.opened_at DESC';

    const stmt = this.db.prepare(query);
    return stmt.all(...params);
  }

  /**
   * Abrir caixa
   */
  static open({ userId, registerNumber, shift, openingAmount, notes }) {
    // Verificar se já existe caixa aberto para este número
    const existingOpen = this.findOpenByRegisterNumber(registerNumber);
    if (existingOpen) {
      throw new Error(`Caixa ${registerNumber} já está aberto`);
    }

    const id = uuidv4();

    const stmt = this.db.prepare(`
      INSERT INTO cash_registers (id, user_id, register_number, shift, opening_amount, status, notes)
      VALUES (?, ?, ?, ?, ?, 'open', ?)
    `);

    stmt.run(id, userId, registerNumber, shift, openingAmount, notes || null);
    return this.findById(id);
  }

  /**
   * Fechar caixa
   */
  static close(id, { closingAmount, notes }) {
    const register = this.findById(id);
    if (!register) return null;
    if (register.status === 'closed') {
      throw new Error('Caixa já está fechado');
    }

    // Calcular valor esperado baseado nas vendas e movimentações
    const expectedAmount = this.calculateExpectedAmount(id);
    const difference = closingAmount - expectedAmount;

    const stmt = this.db.prepare(`
      UPDATE cash_registers SET 
        closing_amount = ?,
        expected_amount = ?,
        difference = ?,
        status = 'closed',
        closed_at = CURRENT_TIMESTAMP,
        notes = COALESCE(?, notes)
      WHERE id = ?
    `);

    stmt.run(closingAmount, expectedAmount, difference, notes, id);
    return this.findById(id);
  }

  /**
   * Calcular valor esperado no caixa
   */
  static calculateExpectedAmount(registerId) {
    const register = this.findById(registerId);
    if (!register) return 0;

    // Valor inicial
    let expected = register.opening_amount;

    // Somar vendas em dinheiro
    const salesStmt = this.db.prepare(`
      SELECT COALESCE(SUM(total), 0) as total
      FROM sales
      WHERE cash_register_id = ? AND payment_method = 'cash' AND status = 'completed'
    `);
    const salesResult = salesStmt.get(registerId);
    const salesTotal = salesResult ? salesResult.total : 0;
    expected += salesTotal;

    // Considerar movimentações (sangrias e suprimentos)
    const movementsStmt = this.db.prepare(`
      SELECT type, COALESCE(SUM(amount), 0) as total
      FROM cash_movements
      WHERE cash_register_id = ?
      GROUP BY type
    `);
    const movements = movementsStmt.all(registerId);

    for (const movement of movements) {
      if (movement.type === 'withdrawal') {
        expected -= movement.total;
      } else if (movement.type === 'deposit') {
        expected += movement.total;
      }
    }

    return Math.round(expected * 100) / 100;
  }

  /**
   * Registrar movimentação de caixa (sangria/suprimento)
   */
  static addMovement({ cashRegisterId, userId, type, amount, reason }) {
    const id = uuidv4();

    const stmt = this.db.prepare(`
      INSERT INTO cash_movements (id, cash_register_id, user_id, type, amount, reason)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt.run(id, cashRegisterId, userId, type, amount, reason);

    return {
      id,
      cash_register_id: cashRegisterId,
      user_id: userId,
      type,
      amount,
      reason
    };
  }

  /**
   * Listar movimentações de um caixa
   */
  static getMovements(cashRegisterId) {
    const stmt = this.db.prepare(`
      SELECT cm.*, u.name as user_name
      FROM cash_movements cm
      JOIN users u ON cm.user_id = u.id
      WHERE cm.cash_register_id = ?
      ORDER BY cm.created_at DESC
    `);
    return stmt.all(cashRegisterId);
  }

  /**
   * Obter resumo do caixa
   */
  static getSummary(cashRegisterId) {
    const register = this.findById(cashRegisterId);
    if (!register) return null;

    // Vendas por forma de pagamento
    const salesByPayment = this.db.prepare(`
      SELECT payment_method, COUNT(*) as count, COALESCE(SUM(total), 0) as total
      FROM sales
      WHERE cash_register_id = ? AND status = 'completed'
      GROUP BY payment_method
    `).all(cashRegisterId);

    // Total de vendas
    const salesTotal = this.db.prepare(`
      SELECT COUNT(*) as count, COALESCE(SUM(total), 0) as total
      FROM sales
      WHERE cash_register_id = ? AND status = 'completed'
    `).get(cashRegisterId) || { count: 0, total: 0 };

    // Vendas canceladas
    const cancelledSales = this.db.prepare(`
      SELECT COUNT(*) as count, COALESCE(SUM(total), 0) as total
      FROM sales
      WHERE cash_register_id = ? AND status = 'cancelled'
    `).get(cashRegisterId) || { count: 0, total: 0 };

    // Movimentações
    const movements = this.getMovements(cashRegisterId);
    const withdrawals = movements.filter(m => m.type === 'withdrawal');
    const deposits = movements.filter(m => m.type === 'deposit');

    return {
      register,
      sales: {
        total: salesTotal.total,
        count: salesTotal.count,
        byPaymentMethod: salesByPayment
      },
      cancelled: cancelledSales,
      movements: {
        withdrawals: {
          count: withdrawals.length,
          total: withdrawals.reduce((sum, m) => sum + m.amount, 0)
        },
        deposits: {
          count: deposits.length,
          total: deposits.reduce((sum, m) => sum + m.amount, 0)
        },
        list: movements
      },
      expectedAmount: this.calculateExpectedAmount(cashRegisterId)
    };
  }
}

module.exports = CashRegisterModel;
