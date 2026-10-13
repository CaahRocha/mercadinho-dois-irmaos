const CustomerModel = require('../models/Customer.model');

class CustomerController {
  /**
   * Listar todos os clientes
   * GET /api/customers
   */
  static async getAll(req, res) {
    try {
      const { active, withDebt } = req.query;
      
      const customers = CustomerModel.findAll({
        active: active === 'false' ? false : (active === 'all' ? null : true),
        withDebt: withDebt === 'true'
      });

      res.json(customers);
    } catch (error) {
      console.error('Erro ao listar clientes:', error);
      res.status(500).json({
        error: true,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Buscar cliente por ID
   * GET /api/customers/:id
   */
  static async getById(req, res) {
    try {
      const customer = CustomerModel.findById(req.params.id);

      if (!customer) {
        return res.status(404).json({
          error: true,
          message: 'Cliente não encontrado'
        });
      }

      res.json(customer);
    } catch (error) {
      console.error('Erro ao buscar cliente:', error);
      res.status(500).json({
        error: true,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Buscar clientes por nome
   * GET /api/customers/search/:name
   */
  static async search(req, res) {
    try {
      const customers = CustomerModel.searchByName(req.params.name);
      res.json(customers);
    } catch (error) {
      console.error('Erro ao buscar clientes:', error);
      res.status(500).json({
        error: true,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Buscar histórico de compras fiado do cliente
   * GET /api/customers/:id/history
   */
  static async getHistory(req, res) {
    try {
      const customer = CustomerModel.findById(req.params.id);

      if (!customer) {
        return res.status(404).json({
          error: true,
          message: 'Cliente não encontrado'
        });
      }

      const history = CustomerModel.getHistory(req.params.id);
      res.json({
        customer,
        sales: history.sales,
        payments: history.payments,
        summary: history.summary
      });
    } catch (error) {
      console.error('Erro ao buscar histórico:', error);
      res.status(500).json({
        error: true,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Criar novo cliente
   * POST /api/customers
   */
  static async create(req, res) {
    try {
      const { name, phone, document, credit_limit } = req.body;

      const customer = CustomerModel.create({
        name,
        phone,
        document,
        credit_limit: credit_limit || 0
      });

      res.status(201).json(customer);
    } catch (error) {
      console.error('Erro ao criar cliente:', error);
      res.status(500).json({
        error: true,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Atualizar cliente
   * PUT /api/customers/:id
   */
  static async update(req, res) {
    try {
      const customer = CustomerModel.update(req.params.id, req.body);

      if (!customer) {
        return res.status(404).json({
          error: true,
          message: 'Cliente não encontrado'
        });
      }

      res.json(customer);
    } catch (error) {
      console.error('Erro ao atualizar cliente:', error);
      res.status(500).json({
        error: true,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Registrar pagamento de fiado
   * POST /api/customers/:id/payment
   */
  static async registerPayment(req, res) {
    try {
      const { amount, payment_method, notes } = req.body;
      const customerId = req.params.id;
      const userId = req.user.id;

      const customer = CustomerModel.findById(customerId);

      if (!customer) {
        return res.status(404).json({
          error: true,
          message: 'Cliente não encontrado'
        });
      }

      if (customer.balance <= 0) {
        return res.status(400).json({
          error: true,
          message: 'Cliente não possui débito pendente'
        });
      }

      if (amount > customer.balance) {
        return res.status(400).json({
          error: true,
          message: `Valor maior que o débito. Débito atual: R$ ${customer.balance.toFixed(2)}`
        });
      }

      const payment = CustomerModel.registerPayment({
        customer_id: customerId,
        user_id: userId,
        amount,
        payment_method,
        notes
      });

      // Buscar cliente atualizado
      const updatedCustomer = CustomerModel.findById(customerId);

      res.status(201).json({
        message: 'Pagamento registrado com sucesso',
        payment,
        customer: updatedCustomer
      });
    } catch (error) {
      console.error('Erro ao registrar pagamento:', error);
      res.status(500).json({
        error: true,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Desativar cliente
   * DELETE /api/customers/:id
   */
  static async delete(req, res) {
    try {
      const customer = CustomerModel.findById(req.params.id);

      if (!customer) {
        return res.status(404).json({
          error: true,
          message: 'Cliente não encontrado'
        });
      }

      if (customer.balance > 0) {
        return res.status(400).json({
          error: true,
          message: 'Não é possível desativar cliente com débito pendente'
        });
      }

      const result = CustomerModel.deactivate(req.params.id);

      res.json({
        message: 'Cliente desativado com sucesso'
      });
    } catch (error) {
      console.error('Erro ao desativar cliente:', error);
      res.status(500).json({
        error: true,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Buscar recebimentos de fiado do dia
   * GET /api/customers/payments/today
   */
  static async getTodayPayments(req, res) {
    try {
      const payments = CustomerModel.getTodayPayments();
      const summary = CustomerModel.getTodayPaymentsSummary();

      res.json({
        payments,
        summary
      });
    } catch (error) {
      console.error('Erro ao buscar recebimentos de fiado:', error);
      res.status(500).json({
        error: true,
        message: 'Erro interno do servidor'
      });
    }
  }
}

module.exports = CustomerController;
