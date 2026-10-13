const SaleModel = require('../models/Sale.model');
const CashRegisterModel = require('../models/CashRegister.model');
const CustomerModel = require('../models/Customer.model');

class SaleController {
  /**
   * Listar vendas
   * GET /api/sales
   */
  static async getAll(req, res) {
    try {
      const { cashRegisterId, userId, startDate, endDate, status } = req.query;

      const sales = SaleModel.findAll({
        cashRegisterId,
        userId,
        startDate,
        endDate,
        status
      });

      res.json(sales);
    } catch (error) {
      console.error('Erro ao listar vendas:', error);
      res.status(500).json({
        error: true,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Buscar venda por ID
   * GET /api/sales/:id
   */
  static async getById(req, res) {
    try {
      const sale = SaleModel.findById(req.params.id);

      if (!sale) {
        return res.status(404).json({
          error: true,
          message: 'Venda não encontrada'
        });
      }

      res.json(sale);
    } catch (error) {
      console.error('Erro ao buscar venda:', error);
      res.status(500).json({
        error: true,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Criar nova venda
   * POST /api/sales
   */
  static async create(req, res) {
    try {
      const { items, discount, paymentMethod, paymentReceived, customer_id } = req.body;

      // Verificar se usuário tem caixa aberto
      const openRegister = CashRegisterModel.findOpenByUser(req.user.id);
      if (!openRegister) {
        return res.status(400).json({
          error: true,
          message: 'Você precisa abrir um caixa antes de registrar vendas'
        });
      }

      // Validar itens
      if (!items || items.length === 0) {
        return res.status(400).json({
          error: true,
          message: 'A venda precisa ter pelo menos um item'
        });
      }

      // Se for fiado, validar cliente
      if (paymentMethod === 'fiado') {
        if (!customer_id) {
          return res.status(400).json({
            error: true,
            message: 'Selecione um cliente para venda fiado'
          });
        }

        const customer = CustomerModel.findById(customer_id);
        if (!customer) {
          return res.status(400).json({
            error: true,
            message: 'Cliente não encontrado'
          });
        }

        if (!customer.active) {
          return res.status(400).json({
            error: true,
            message: 'Cliente inativo'
          });
        }

        // Calcular total da venda
        const total = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0) - (discount || 0);

        // Verificar limite (se credit_limit = 0, sem limite)
        if (customer.credit_limit > 0) {
          const available = customer.credit_limit - customer.balance;
          if (total > available) {
            return res.status(400).json({
              error: true,
              message: `Limite de crédito insuficiente. Disponível: R$ ${available.toFixed(2)}`
            });
          }
        }
      }

      const sale = SaleModel.create({
        cashRegisterId: openRegister.id,
        userId: req.user.id,
        customerId: customer_id,
        items,
        discount: discount || 0,
        paymentMethod,
        paymentReceived: paymentMethod === 'fiado' ? 0 : paymentReceived
      });

      // Se for fiado, atualizar saldo do cliente
      if (paymentMethod === 'fiado' && customer_id) {
        CustomerModel.addDebt(customer_id, sale.total);
      }

      res.status(201).json(sale);
    } catch (error) {
      console.error('Erro ao criar venda:', error);
      res.status(500).json({
        error: true,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Cancelar venda
   * POST /api/sales/:id/cancel
   */
  static async cancel(req, res) {
    try {
      const { reason } = req.body;

      // Apenas admin e manager podem cancelar vendas
      if (req.user.role === 'cashier') {
        return res.status(403).json({
          error: true,
          message: 'Você não tem permissão para cancelar vendas'
        });
      }

      if (!reason) {
        return res.status(400).json({
          error: true,
          message: 'Informe o motivo do cancelamento'
        });
      }

      const sale = SaleModel.cancel(req.params.id, {
        reason,
        userId: req.user.id
      });

      if (!sale) {
        return res.status(404).json({
          error: true,
          message: 'Venda não encontrada'
        });
      }

      res.json(sale);
    } catch (error) {
      console.error('Erro ao cancelar venda:', error);
      res.status(400).json({
        error: true,
        message: error.message
      });
    }
  }

  /**
   * Vendas do dia
   * GET /api/sales/today
   */
  static async getToday(req, res) {
    try {
      const { cashRegisterId } = req.query;
      const summary = SaleModel.getTodaySales(cashRegisterId);

      res.json(summary);
    } catch (error) {
      console.error('Erro ao buscar vendas do dia:', error);
      res.status(500).json({
        error: true,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Produtos mais vendidos
   * GET /api/sales/top-products
   */
  static async getTopProducts(req, res) {
    try {
      const { limit, startDate, endDate } = req.query;

      const products = SaleModel.getTopProducts(
        limit ? parseInt(limit) : 10,
        startDate,
        endDate
      );

      res.json(products);
    } catch (error) {
      console.error('Erro ao buscar produtos mais vendidos:', error);
      res.status(500).json({
        error: true,
        message: 'Erro interno do servidor'
      });
    }
  }
}

module.exports = SaleController;
