const CashRegisterModel = require('../models/CashRegister.model');
const SaleModel = require('../models/Sale.model');
const CustomerModel = require('../models/Customer.model');
const EmailService = require('../services/email.service');

class CashRegisterController {
  /**
   * Listar caixas
   * GET /api/cash-registers
   */
  static async getAll(req, res) {
    try {
      const { status, date, registerNumber } = req.query;
      
      const registers = CashRegisterModel.findAll({
        status,
        date,
        registerNumber: registerNumber ? parseInt(registerNumber) : null
      });

      res.json(registers);
    } catch (error) {
      console.error('Erro ao listar caixas:', error);
      res.status(500).json({
        error: true,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Buscar caixa por ID
   * GET /api/cash-registers/:id
   */
  static async getById(req, res) {
    try {
      const register = CashRegisterModel.findById(req.params.id);

      if (!register) {
        return res.status(404).json({
          error: true,
          message: 'Caixa não encontrado'
        });
      }

      res.json(register);
    } catch (error) {
      console.error('Erro ao buscar caixa:', error);
      res.status(500).json({
        error: true,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Buscar caixa aberto do usuário logado
   * GET /api/cash-registers/my-open
   */
  static async getMyOpen(req, res) {
    try {
      const register = CashRegisterModel.findOpenByUser(req.user.id);

      if (!register) {
        return res.json(null);
      }

      res.json(register);
    } catch (error) {
      console.error('Erro ao buscar caixa:', error);
      res.status(500).json({
        error: true,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Listar caixas abertos
   * GET /api/cash-registers/open
   */
  static async getOpen(req, res) {
    try {
      const registers = CashRegisterModel.findAll({ status: 'open' });
      res.json(registers);
    } catch (error) {
      console.error('Erro ao listar caixas abertos:', error);
      res.status(500).json({
        error: true,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Abrir caixa
   * POST /api/cash-registers/open
   */
  static async open(req, res) {
    try {
      const { registerNumber, shift, openingAmount, notes } = req.body;

      // Verificar se usuário já tem caixa aberto
      const existingOpen = CashRegisterModel.findOpenByUser(req.user.id);
      if (existingOpen) {
        return res.status(400).json({
          error: true,
          message: 'Você já possui um caixa aberto. Feche-o antes de abrir outro.'
        });
      }

      const register = CashRegisterModel.open({
        userId: req.user.id,
        registerNumber,
        shift,
        openingAmount,
        notes
      });

      res.status(201).json(register);
    } catch (error) {
      console.error('Erro ao abrir caixa:', error);
      res.status(400).json({
        error: true,
        message: error.message
      });
    }
  }

  /**
   * Fechar caixa
   * POST /api/cash-registers/:id/close
   */
  static async close(req, res) {
    try {
      const { closingAmount, notes } = req.body;

      const register = CashRegisterModel.findById(req.params.id);
      
      if (!register) {
        return res.status(404).json({
          error: true,
          message: 'Caixa não encontrado'
        });
      }

      // Apenas admin/manager ou o próprio operador pode fechar
      if (req.user.role === 'cashier' && register.user_id !== req.user.id) {
        return res.status(403).json({
          error: true,
          message: 'Você não tem permissão para fechar este caixa'
        });
      }

      const closedRegister = CashRegisterModel.close(req.params.id, {
        closingAmount,
        notes
      });

      // Enviar email com relatório (async, não bloqueia resposta)
      try {
        const sales = SaleModel.findByCashRegister(req.params.id);
        const movements = CashRegisterModel.getMovements(req.params.id);
        const summary = CashRegisterModel.getSummary(req.params.id);
        const fiadoPayments = CustomerModel.getTodayPayments();

        const reportData = {
          register: closedRegister,
          user: { id: req.user.id, name: req.user.name },
          sales,
          movements,
          summary,
          fiadoPayments
        };

        // Enviar email em background (não espera)
        EmailService.sendCashRegisterReport(reportData)
          .then(result => {
            if (result.success) {
              console.log('Relatório de fechamento enviado por email');
            } else {
              console.log('Email não enviado:', result.reason || result.error);
            }
          })
          .catch(err => console.error('Erro ao enviar email:', err));
      } catch (emailErr) {
        console.error('Erro ao preparar relatório para email:', emailErr);
      }

      res.json(closedRegister);
    } catch (error) {
      console.error('Erro ao fechar caixa:', error);
      res.status(400).json({
        error: true,
        message: error.message
      });
    }
  }

  /**
   * Registrar sangria (retirada)
   * POST /api/cash-registers/:id/withdrawal
   */
  static async withdrawal(req, res) {
    try {
      const { amount, reason } = req.body;

      const register = CashRegisterModel.findById(req.params.id);
      
      if (!register) {
        return res.status(404).json({
          error: true,
          message: 'Caixa não encontrado'
        });
      }

      if (register.status !== 'open') {
        return res.status(400).json({
          error: true,
          message: 'Caixa não está aberto'
        });
      }

      const movement = CashRegisterModel.addMovement({
        cashRegisterId: req.params.id,
        userId: req.user.id,
        type: 'withdrawal',
        amount,
        reason
      });

      res.status(201).json(movement);
    } catch (error) {
      console.error('Erro ao registrar sangria:', error);
      res.status(500).json({
        error: true,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Registrar suprimento (entrada)
   * POST /api/cash-registers/:id/deposit
   */
  static async deposit(req, res) {
    try {
      const { amount, reason } = req.body;

      const register = CashRegisterModel.findById(req.params.id);
      
      if (!register) {
        return res.status(404).json({
          error: true,
          message: 'Caixa não encontrado'
        });
      }

      if (register.status !== 'open') {
        return res.status(400).json({
          error: true,
          message: 'Caixa não está aberto'
        });
      }

      const movement = CashRegisterModel.addMovement({
        cashRegisterId: req.params.id,
        userId: req.user.id,
        type: 'deposit',
        amount,
        reason
      });

      res.status(201).json(movement);
    } catch (error) {
      console.error('Erro ao registrar suprimento:', error);
      res.status(500).json({
        error: true,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Obter resumo do caixa
   * GET /api/cash-registers/:id/summary
   */
  static async getSummary(req, res) {
    try {
      const summary = CashRegisterModel.getSummary(req.params.id);

      if (!summary) {
        return res.status(404).json({
          error: true,
          message: 'Caixa não encontrado'
        });
      }

      res.json(summary);
    } catch (error) {
      console.error('Erro ao obter resumo:', error);
      res.status(500).json({
        error: true,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Listar movimentações do caixa
   * GET /api/cash-registers/:id/movements
   */
  static async getMovements(req, res) {
    try {
      const movements = CashRegisterModel.getMovements(req.params.id);
      res.json(movements);
    } catch (error) {
      console.error('Erro ao listar movimentações:', error);
      res.status(500).json({
        error: true,
        message: 'Erro interno do servidor'
      });
    }
  }
}

module.exports = CashRegisterController;
