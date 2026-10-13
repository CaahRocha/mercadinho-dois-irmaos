const express = require('express');
const router = express.Router();

const SettingsModel = require('../models/Settings.model');
const { authenticate, authorize, ROLES } = require('../middleware/auth.middleware');

// Todas as rotas precisam de autenticação
router.use(authenticate);

// GET /api/settings - Buscar todas configurações (todos podem ver)
router.get('/', (req, res) => {
  try {
    const settings = SettingsModel.getAll();
    res.json(settings);
  } catch (error) {
    console.error('Erro ao buscar configurações:', error);
    res.status(500).json({ error: true, message: 'Erro interno' });
  }
});

// GET /api/settings/:key - Buscar configuração específica
router.get('/:key', (req, res) => {
  try {
    const value = SettingsModel.get(req.params.key);
    res.json({ key: req.params.key, value });
  } catch (error) {
    console.error('Erro ao buscar configuração:', error);
    res.status(500).json({ error: true, message: 'Erro interno' });
  }
});

// PUT /api/settings - Atualizar configurações (admin e manager)
router.put('/', authorize(ROLES.ADMIN, ROLES.MANAGER), (req, res) => {
  try {
    const settings = SettingsModel.setMultiple(req.body);
    res.json(settings);
  } catch (error) {
    console.error('Erro ao salvar configurações:', error);
    res.status(500).json({ error: true, message: 'Erro interno' });
  }
});

// PUT /api/settings/:key - Atualizar configuração específica (admin e manager)
router.put('/:key', authorize(ROLES.ADMIN, ROLES.MANAGER), (req, res) => {
  try {
    const value = SettingsModel.set(req.params.key, req.body.value);
    res.json({ key: req.params.key, value });
  } catch (error) {
    console.error('Erro ao salvar configuração:', error);
    res.status(500).json({ error: true, message: 'Erro interno' });
  }
});

// POST /api/settings/test-email - Enviar email de teste
const EmailService = require('../services/email.service');

router.post('/test-email', authorize(ROLES.ADMIN, ROLES.MANAGER), async (req, res) => {
  try {
    const settings = SettingsModel.getAll();
    
    if (!settings.email_host || !settings.email_user || !settings.email_password) {
      return res.status(400).json({ 
        error: true, 
        message: 'Configure o servidor SMTP antes de testar' 
      });
    }

    if (!settings.email_to) {
      return res.status(400).json({ 
        error: true, 
        message: 'Configure o email destinatário antes de testar' 
      });
    }

    const html = `
      <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 500px; margin: 0 auto;">
        <div style="background: #4f46e5; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0;">Sistema Mercado</h1>
        </div>
        <div style="background: #f3f4f6; padding: 20px; border: 1px solid #e5e7eb;">
          <h2 style="color: #16a34a;">✓ Email Configurado com Sucesso!</h2>
          <p>Este é um email de teste para verificar se as configurações SMTP estão corretas.</p>
          <p>Se você recebeu este email, o sistema está pronto para enviar relatórios de fechamento de caixa.</p>
          <hr style="border: none; border-top: 1px solid #d1d5db; margin: 20px 0;">
          <p style="color: #6b7280; font-size: 12px;">
            Enviado em: ${new Date().toLocaleString('pt-BR')}<br>
            Servidor: ${settings.email_host}:${settings.email_port}
          </p>
        </div>
      </div>
    `;

    const result = await EmailService.send({
      to: settings.email_to,
      subject: 'Teste de Email - Sistema Mercado',
      html
    });

    if (result.success) {
      res.json({ success: true, message: 'Email de teste enviado!' });
    } else {
      res.json({ success: false, error: result.error || result.reason });
    }
  } catch (error) {
    console.error('Erro ao enviar email de teste:', error);
    res.status(500).json({ error: true, message: error.message });
  }
});

module.exports = router;
