const nodemailer = require('nodemailer');
const SettingsModel = require('../models/Settings.model');

class EmailService {
  /**
   * Criar transporter com configurações do banco
   */
  static createTransporter() {
    const settings = SettingsModel.getAll();
    
    if (!settings.email_host || !settings.email_user || !settings.email_password) {
      return null;
    }

    return nodemailer.createTransport({
      host: settings.email_host,
      port: parseInt(settings.email_port) || 587,
      secure: settings.email_port === '465',
      auth: {
        user: settings.email_user,
        pass: settings.email_password
      }
    });
  }

  /**
   * Enviar email
   */
  static async send({ to, subject, html }) {
    const transporter = this.createTransporter();
    
    if (!transporter) {
      console.log('Email não configurado - pulando envio');
      return { success: false, reason: 'not_configured' };
    }

    const settings = SettingsModel.getAll();
    const from = settings.email_from || settings.email_user;

    try {
      const result = await transporter.sendMail({
        from: `Sistema Mercado <${from}>`,
        to,
        subject,
        html
      });
      
      console.log('Email enviado com sucesso:', result.messageId);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('Erro ao enviar email:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Gerar HTML do relatório de fechamento
   */
  static generateCashRegisterReport(data) {
    const { register, user, sales, movements, summary, fiadoPayments } = data;
    
    const formatCurrency = (value) => {
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      }).format(value || 0);
    };

    const formatDate = (dateStr) => {
      if (!dateStr) return '-';
      // Adiciona 'Z' para indicar UTC se não tiver timezone
      const utcDate = dateStr.includes('Z') || dateStr.includes('+') ? dateStr : dateStr + 'Z';
      return new Date(utcDate).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    };

    const getPaymentLabel = (method) => {
      const labels = {
        cash: 'Dinheiro',
        credit: 'Crédito',
        debit: 'Débito',
        pix: 'PIX',
        fiado: 'Fiado'
      };
      return labels[method] || method;
    };

    // Agrupar vendas por forma de pagamento e calcular totais
    const salesByPayment = {};
    let totalSalesCount = 0;
    let totalSalesValue = 0;
    let cancelledCount = 0;

    sales.forEach(sale => {
      if (sale.status === 'completed') {
        if (!salesByPayment[sale.payment_method]) {
          salesByPayment[sale.payment_method] = { count: 0, total: 0 };
        }
        salesByPayment[sale.payment_method].count++;
        salesByPayment[sale.payment_method].total += sale.total;
        totalSalesCount++;
        totalSalesValue += sale.total;
      } else if (sale.status === 'cancelled') {
        cancelledCount++;
      }
    });

    // Calcular movimentações
    const totalWithdrawals = movements.filter(m => m.type === 'withdrawal').reduce((sum, m) => sum + m.amount, 0);
    const totalDeposits = movements.filter(m => m.type === 'deposit').reduce((sum, m) => sum + m.amount, 0);

    // Calcular total de recebimentos de fiado
    const fiadoTotal = fiadoPayments ? fiadoPayments.reduce((sum, p) => sum + p.amount, 0) : 0;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #4f46e5; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .header h1 { margin: 0; font-size: 24px; }
    .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
    .section { background: white; padding: 15px; margin-bottom: 15px; border-radius: 8px; border: 1px solid #e5e7eb; }
    .section h3 { margin: 0 0 10px 0; color: #374151; border-bottom: 2px solid #4f46e5; padding-bottom: 5px; }
    .section-fiado { border-left: 4px solid #f59e0b; }
    .section-fiado h3 { border-bottom-color: #f59e0b; color: #b45309; }
    .row { display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid #f3f4f6; }
    .row:last-child { border-bottom: none; }
    .label { color: #6b7280; }
    .value { font-weight: 600; color: #111827; }
    .total-row { background: #ecfdf5; padding: 10px; border-radius: 4px; margin-top: 10px; }
    .total-row .value { color: #059669; font-size: 1.25rem; }
    .fiado-total { background: #fef3c7; }
    .fiado-total .value { color: #b45309; }
    .danger { color: #dc2626; }
    .success { color: #059669; }
    .warning { color: #d97706; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    th, td { padding: 8px; text-align: left; border-bottom: 1px solid #e5e7eb; }
    th { background: #f3f4f6; font-weight: 600; }
    .footer { text-align: center; padding: 15px; color: #9ca3af; font-size: 12px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Relatório de Fechamento de Caixa</h1>
    <p style="margin: 5px 0 0 0;">Caixa #${register.register_number} - Turno ${register.shift}</p>
  </div>
  
  <div class="content">
    <div class="section">
      <h3>Informações do Caixa</h3>
      <div class="row">
        <span class="label">Operador:</span>
        <span class="value">${user.name}</span>
      </div>
      <div class="row">
        <span class="label">Abertura:</span>
        <span class="value">${formatDate(register.opened_at)}</span>
      </div>
      <div class="row">
        <span class="label">Fechamento:</span>
        <span class="value">${formatDate(register.closed_at)}</span>
      </div>
      <div class="row">
        <span class="label">Valor de Abertura:</span>
        <span class="value">${formatCurrency(register.opening_amount)}</span>
      </div>
    </div>

    <div class="section">
      <h3>Resumo de Vendas</h3>
      <div class="row">
        <span class="label">Total de Vendas:</span>
        <span class="value">${totalSalesCount}</span>
      </div>
      <div class="row">
        <span class="label">Vendas Canceladas:</span>
        <span class="value ${cancelledCount > 0 ? 'danger' : ''}">${cancelledCount}</span>
      </div>
      
      <table>
        <thead>
          <tr>
            <th>Forma de Pagamento</th>
            <th>Qtd</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          ${Object.entries(salesByPayment).map(([method, data]) => `
            <tr>
              <td>${getPaymentLabel(method)}</td>
              <td>${data.count}</td>
              <td>${formatCurrency(data.total)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      
      <div class="total-row">
        <div class="row">
          <span class="label" style="font-size: 1.1rem;">Total em Vendas:</span>
          <span class="value">${formatCurrency(totalSalesValue)}</span>
        </div>
      </div>
    </div>

    ${movements.length > 0 ? `
    <div class="section">
      <h3>Movimentações de Caixa</h3>
      <table>
        <thead>
          <tr>
            <th>Tipo</th>
            <th>Valor</th>
            <th>Motivo</th>
          </tr>
        </thead>
        <tbody>
          ${movements.map(mov => `
            <tr>
              <td class="${mov.type === 'withdrawal' ? 'danger' : 'success'}">
                ${mov.type === 'withdrawal' ? 'Sangria' : 'Suprimento'}
              </td>
              <td>${formatCurrency(mov.amount)}</td>
              <td>${mov.reason}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <div class="row" style="margin-top: 10px;">
        <span class="label">Total Sangrias:</span>
        <span class="value danger">${formatCurrency(totalWithdrawals)}</span>
      </div>
      <div class="row">
        <span class="label">Total Suprimentos:</span>
        <span class="value success">${formatCurrency(totalDeposits)}</span>
      </div>
    </div>
    ` : ''}

    <div class="section section-fiado">
      <h3>Recebimentos de Fiado (Não entra no caixa)</h3>
      ${fiadoPayments && fiadoPayments.length > 0 ? `
      <table>
        <thead>
          <tr>
            <th>Cliente</th>
            <th>Valor</th>
            <th>Forma Pgto</th>
          </tr>
        </thead>
        <tbody>
          ${fiadoPayments.map(payment => `
            <tr>
              <td>${payment.customer_name}</td>
              <td class="success">${formatCurrency(payment.amount)}</td>
              <td>${getPaymentLabel(payment.payment_method)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <div class="total-row fiado-total">
        <div class="row">
          <span class="label" style="font-size: 1.1rem;">Total Recebido de Fiado:</span>
          <span class="value">${formatCurrency(fiadoTotal)}</span>
        </div>
      </div>
      ` : `<p style="color: #9ca3af; text-align: center;">Nenhum recebimento de fiado no período</p>`}
    </div>

    <div class="section">
      <h3>Conferência de Caixa</h3>
      <div class="row">
        <span class="label">Valor Esperado:</span>
        <span class="value">${formatCurrency(register.expected_amount)}</span>
      </div>
      <div class="row">
        <span class="label">Valor Informado:</span>
        <span class="value">${formatCurrency(register.closing_amount)}</span>
      </div>
      <div class="row" style="background: ${register.difference === 0 ? '#ecfdf5' : register.difference > 0 ? '#fef3c7' : '#fee2e2'}; padding: 10px; border-radius: 4px; margin-top: 10px;">
        <span class="label" style="font-weight: 600;">Diferença:</span>
        <span class="value ${register.difference === 0 ? 'success' : register.difference > 0 ? 'warning' : 'danger'}">
          ${formatCurrency(register.difference)}
          ${register.difference === 0 ? ' (OK)' : register.difference > 0 ? ' (Sobra)' : ' (Falta)'}
        </span>
      </div>
    </div>

    ${register.notes ? `
    <div class="section">
      <h3>Observações</h3>
      <p style="margin: 0;">${register.notes}</p>
    </div>
    ` : ''}
  </div>
  
  <div class="footer">
    <p>Este relatório foi gerado automaticamente pelo Sistema Mercado</p>
    <p>${new Date().toLocaleString('pt-BR')}</p>
  </div>
</body>
</html>
    `;

    return html;
  }

  /**
   * Enviar relatório de fechamento de caixa
   */
  static async sendCashRegisterReport(data) {
    const settings = SettingsModel.getAll();
    const to = settings.email_to;

    console.log('=== ENVIANDO RELATÓRIO DE FECHAMENTO ===');
    console.log('Destinatário:', to);
    console.log('Host SMTP:', settings.email_host);
    console.log('Usuário SMTP:', settings.email_user);

    if (!to) {
      console.log('Email destinatário não configurado');
      return { success: false, reason: 'no_recipient' };
    }

    const html = this.generateCashRegisterReport(data);
    const subject = `Fechamento de Caixa #${data.register.register_number} - ${new Date().toLocaleDateString('pt-BR')}`;

    console.log('Assunto:', subject);
    
    const result = await this.send({ to, subject, html });
    console.log('Resultado:', result);
    console.log('========================================');
    
    return result;
  }
}

module.exports = EmailService;
