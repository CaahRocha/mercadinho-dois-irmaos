import { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { 
  FiDollarSign, 
  FiLock, 
  FiUnlock, 
  FiArrowDownCircle, 
  FiArrowUpCircle,
  FiList,
  FiClock,
  FiShoppingCart,
  FiUser,
  FiCheckCircle
} from 'react-icons/fi';

// Formata centavos para exibição (12549 -> "125,49")
const formatCurrencyInput = (value) => {
  if (!value && value !== 0) return '';
  const numValue = parseInt(value.toString().replace(/\D/g, ''), 10) || 0;
  return (numValue / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// Converte para centavos (limpa e retorna número inteiro)
const parseCurrencyInput = (value) => {
  return parseInt(value.toString().replace(/\D/g, ''), 10) || 0;
};

// Converte centavos para valor decimal para enviar à API
const centsToDecimal = (cents) => {
  return (parseInt(cents, 10) || 0) / 100;
};

function CashRegister() {
  const { user, isManager } = useAuth();
  const [openRegister, setOpenRegister] = useState(null);
  const [summary, setSummary] = useState(null);
  const [fiadoPayments, setFiadoPayments] = useState({ payments: [], summary: { total: 0, count: 0, byMethod: [] } });
  const [loading, setLoading] = useState(true);
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [showMovementModal, setShowMovementModal] = useState(false);
  const [showSalesModal, setShowSalesModal] = useState(false);
  const [salesList, setSalesList] = useState([]);
  const [movementType, setMovementType] = useState('withdrawal');
  const [submitting, setSubmitting] = useState(false);
  const [openingRegister, setOpeningRegister] = useState(false);
  const [closingRegister, setClosingRegister] = useState(false);
  const [timeline, setTimeline] = useState([]);

  const [openForm, setOpenForm] = useState({
    registerNumber: '1',
    shift: '1',
    openingAmount: ''
  });

  const [closeForm, setCloseForm] = useState({
    closingAmount: '',
    notes: ''
  });

  const [movementForm, setMovementForm] = useState({
    amount: '',
    reason: ''
  });

  useEffect(() => {
    loadCurrentRegister();
  }, []);

  const loadCurrentRegister = async () => {
    try {
      // Primeiro tenta buscar caixa do usuário logado
      let response = await api.get('/cash-registers/my-open');
      
      // Se não tem caixa próprio, busca qualquer caixa aberto (para mostrar status)
      if (!response.data) {
        const openRegisters = await api.get('/cash-registers/open');
        if (openRegisters.data && openRegisters.data.length > 0) {
          // Mostra o primeiro caixa aberto (para visualização)
          setOpenRegister({ ...openRegisters.data[0], isOtherUser: true });
          loadSummary(openRegisters.data[0].id);
          return;
        }
      }
      
      setOpenRegister(response.data);
      
      if (response.data) {
        loadSummary(response.data.id);
      }
    } catch (error) {
      console.error('Erro ao carregar caixa:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSummary = async (registerId) => {
    try {
      const response = await api.get(`/cash-registers/${registerId}/summary`);
      setSummary(response.data);
    } catch (error) {
      console.error('Erro ao carregar resumo:', error);
    }
  };

  const loadFiadoPayments = async () => {
    try {
      const response = await api.get('/customers/payments/today');
      setFiadoPayments(response.data);
    } catch (error) {
      console.error('Erro ao carregar recebimentos de fiado:', error);
    }
  };

  // Carrega recebimentos de fiado quando tem caixa aberto
  useEffect(() => {
    if (openRegister) {
      loadFiadoPayments();
      loadSalesList();
    }
  }, [openRegister]);

  // Constrói a timeline quando tem dados
  useEffect(() => {
    if (openRegister && summary) {
      buildTimeline();
    }
  }, [openRegister, summary, salesList, fiadoPayments]);

  const buildTimeline = () => {
    const items = [];
    
    // Abertura do caixa
    if (openRegister) {
      items.push({
        id: 'opening',
        type: 'opening',
        time: openRegister.opened_at,
        description: 'Abertura de Caixa',
        value: openRegister.opening_amount,
        icon: 'unlock',
        color: '#16a34a'
      });
    }
    
    // Vendas
    salesList.forEach(sale => {
      if (sale.status === 'completed') {
        items.push({
          id: `sale-${sale.id}`,
          type: 'sale',
          time: sale.created_at,
          description: `Venda - ${getPaymentLabel(sale.payment_method)}`,
          value: sale.total,
          icon: 'cart',
          color: sale.payment_method === 'fiado' ? '#f59e0b' : '#3b82f6'
        });
      } else if (sale.status === 'cancelled') {
        items.push({
          id: `sale-${sale.id}`,
          type: 'cancelled',
          time: sale.created_at,
          description: 'Venda Cancelada',
          value: sale.total,
          icon: 'x',
          color: '#dc2626'
        });
      }
    });
    
    // Movimentações (sangrias e suprimentos)
    if (summary?.movements?.list) {
      summary.movements.list.forEach(mov => {
        items.push({
          id: `mov-${mov.id}`,
          type: mov.type,
          time: mov.created_at,
          description: mov.type === 'withdrawal' ? `Sangria - ${mov.reason}` : `Suprimento - ${mov.reason}`,
          value: mov.amount,
          icon: mov.type === 'withdrawal' ? 'arrow-up' : 'arrow-down',
          color: mov.type === 'withdrawal' ? '#dc2626' : '#16a34a'
        });
      });
    }
    
    // Recebimentos de fiado
    fiadoPayments.payments?.forEach(payment => {
      items.push({
        id: `fiado-${payment.id}`,
        type: 'fiado-payment',
        time: payment.created_at,
        description: `Recebimento Fiado - ${payment.customer_name}`,
        value: payment.amount,
        icon: 'user',
        color: '#f59e0b'
      });
    });
    
    // Ordena por data/hora (mais recente primeiro)
    items.sort((a, b) => new Date(b.time) - new Date(a.time));
    
    setTimeline(items);
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

  const loadSalesList = async () => {
    if (!openRegister) return;
    try {
      const response = await api.get(`/sales?cashRegisterId=${openRegister.id}`);
      setSalesList(response.data);
    } catch (error) {
      console.error('Erro ao carregar vendas:', error);
    }
  };

  const handleOpenRegister = async (e) => {
    e.preventDefault();
    
    if (openingRegister) return; // Evita clique duplo
    setOpeningRegister(true);

    try {
      await api.post('/cash-registers/open', {
        registerNumber: parseInt(openForm.registerNumber),
        shift: parseInt(openForm.shift),
        openingAmount: centsToDecimal(openForm.openingAmount)
      });

      toast.success('Caixa aberto com sucesso!');
      setShowOpenModal(false);
      loadCurrentRegister();
    } catch (error) {
      const message = error.response?.data?.message || 'Erro ao abrir caixa';
      toast.error(message);
      setShowOpenModal(false);
      // Atualiza a tela mesmo com erro (pode ser que o caixa já esteja aberto)
      loadCurrentRegister();
    } finally {
      setOpeningRegister(false);
    }
  };

  const handleCloseRegister = async (e) => {
    e.preventDefault();
    
    if (closingRegister) return; // Evita clique duplo
    setClosingRegister(true);

    try {
      await api.post(`/cash-registers/${openRegister.id}/close`, {
        closingAmount: centsToDecimal(closeForm.closingAmount),
        notes: closeForm.notes
      });

      toast.success('Caixa fechado com sucesso!');
      setShowCloseModal(false);
      setOpenRegister(null);
      setSummary(null);
    } catch (error) {
      const message = error.response?.data?.message || 'Erro ao fechar caixa';
      toast.error(message);
    } finally {
      setClosingRegister(false);
    }
  };

  const handleMovement = async (e) => {
    e.preventDefault();
    
    if (submitting) return; // Evita clique duplo
    setSubmitting(true);

    try {
      const endpoint = movementType === 'withdrawal' ? 'withdrawal' : 'deposit';
      await api.post(`/cash-registers/${openRegister.id}/${endpoint}`, {
        amount: centsToDecimal(movementForm.amount),
        reason: movementForm.reason
      });

      toast.success(movementType === 'withdrawal' ? 'Sangria registrada!' : 'Suprimento registrado!');
      setShowMovementModal(false);
      setMovementForm({ amount: '', reason: '' });
      loadSummary(openRegister.id);
    } catch (error) {
      const message = error.response?.data?.message || 'Erro ao registrar movimentação';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const utcDate = dateStr.includes('Z') || dateStr.includes('+') ? dateStr : dateStr + 'Z';
    return new Date(utcDate).toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit',
      timeZone: 'America/Sao_Paulo'
    });
  };

  // Calcular saldo atual (para timeline)
  const calculateRunningBalance = () => {
    if (!openRegister) return 0;
    let balance = openRegister.opening_amount || 0;
    
    // Adiciona vendas em dinheiro/débito/crédito/pix (não fiado)
    salesList.forEach(sale => {
      if (sale.status === 'completed' && sale.payment_method !== 'fiado') {
        balance += sale.total;
      }
    });
    
    // Subtrai sangrias e adiciona suprimentos
    if (summary?.movements?.list) {
      summary.movements.list.forEach(mov => {
        if (mov.type === 'withdrawal') {
          balance -= mov.amount;
        } else {
          balance += mov.amount;
        }
      });
    }
    
    return balance;
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="cash-register-page">
      <header className="page-header">
        <h1>Controle de Caixa</h1>
        <p>Gerenciamento de abertura, fechamento e movimentações</p>
      </header>

      {/* Status atual */}
      <div className={`card mb-4`} style={{ 
        background: openRegister ? '#dcfce7' : '#fef3c7',
        border: openRegister ? '1px solid #86efac' : '1px solid #fcd34d'
      }}>
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            {openRegister ? <FiUnlock size={32} color="#16a34a" /> : <FiLock size={32} color="#d97706" />}
            <div>
              <h2 style={{ fontSize: '1.25rem', margin: 0 }}>
                {openRegister 
                  ? `Caixa ${openRegister.register_number} - Turno ${openRegister.shift}` 
                  : 'Nenhum caixa aberto'}
              </h2>
              <p style={{ margin: 0, color: '#6b7280' }}>
                {openRegister 
                  ? <>Aberto por <strong>{openRegister.user_name || 'Usuário'}</strong> em {new Date(openRegister.opened_at.includes('Z') ? openRegister.opened_at : openRegister.opened_at + 'Z').toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</>
                  : 'Abra um caixa para iniciar as operações'
                }
              </p>
              {openRegister?.isOtherUser && !isManager && (
                <p style={{ margin: '0.5rem 0 0 0', color: '#dc2626', fontSize: '0.875rem', fontWeight: 500 }}>
                  ⚠️ Feche este caixa antes de abrir outro
                </p>
              )}
            </div>
          </div>

          {!openRegister ? (
            <button className="btn btn-primary" onClick={() => setShowOpenModal(true)}>
              <FiUnlock />
              Abrir Caixa
            </button>
          ) : (
            <div className="flex gap-2">
              {isManager && (
                <>
                  <button 
                    className="btn btn-secondary"
                    onClick={() => { setMovementType('deposit'); setShowMovementModal(true); }}
                  >
                    <FiArrowDownCircle />
                    Suprimento
                  </button>
                  <button 
                    className="btn btn-secondary"
                    onClick={() => { setMovementType('withdrawal'); setShowMovementModal(true); }}
                  >
                    <FiArrowUpCircle />
                    Sangria
                  </button>
                </>
              )}
              {/* Operador só fecha seu próprio caixa, gerente/admin pode fechar qualquer um */}
              {(!openRegister.isOtherUser || isManager) && (
                <button className="btn btn-danger" onClick={() => setShowCloseModal(true)}>
                  <FiLock />
                  Fechar Caixa
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Resumo do caixa */}
      {openRegister && summary && (
        <>
          {/* Card de Resumo Estilo PDV */}
          <div className="card mb-4" style={{ background: '#fff' }}>
            <div className="card-header" style={{ borderBottom: '1px solid #e5e7eb', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
              <h3 className="card-title" style={{ margin: 0 }}>
                Resumo do Caixa #{openRegister.register_number}
              </h3>
              <small className="text-muted">
                Aberto Hoje ({new Date(openRegister.opened_at.includes('Z') ? openRegister.opened_at : openRegister.opened_at + 'Z').toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })})
              </small>
            </div>

            {/* Seção de Vendas */}
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0' }}>
                <span>Total de vendas:</span>
                <strong>{formatCurrency(summary.sales.total)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', color: '#dc2626' }}>
                <span>{summary.sales.byPaymentMethod.find(m => m.payment_method === 'fiado')?.count || 0} Vendas debitadas (fiado):</span>
                <strong>-{formatCurrency(summary.sales.byPaymentMethod.find(m => m.payment_method === 'fiado')?.total || 0)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 0', borderTop: '1px solid #e5e7eb', fontWeight: 600 }}>
                <span>Total recebido:</span>
                <strong style={{ color: '#16a34a' }}>
                  {formatCurrency(summary.sales.total - (summary.sales.byPaymentMethod.find(m => m.payment_method === 'fiado')?.total || 0))}
                </strong>
              </div>
            </div>

            {/* Seção de Movimentação do Caixa */}
            <div style={{ background: '#f9fafb', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0' }}>
                <span>Saldo inicial:</span>
                <span>{formatCurrency(openRegister.opening_amount)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0' }}>
                <span>Total recebido:</span>
                <span style={{ color: '#16a34a' }}>
                  {formatCurrency(summary.sales.total - (summary.sales.byPaymentMethod.find(m => m.payment_method === 'fiado')?.total || 0))}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0' }}>
                <span>Valor retirado (sangrias):</span>
                <span style={{ color: '#dc2626' }}>-{formatCurrency(summary.movements.withdrawals.total || 0)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderTop: '1px solid #d1d5db', marginTop: '0.5rem', fontWeight: 600 }}>
                <span>Saldo Final (em caixa):</span>
                <strong style={{ fontSize: '1.1rem' }}>{formatCurrency(summary.expectedAmount)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0', color: '#6b7280' }}>
                <span>Lucro/Prejuízo bruto:</span>
                <span style={{ color: (summary.sales.total - (summary.sales.byPaymentMethod.find(m => m.payment_method === 'fiado')?.total || 0)) >= 0 ? '#16a34a' : '#dc2626' }}>
                  {formatCurrency(summary.sales.total - (summary.sales.byPaymentMethod.find(m => m.payment_method === 'fiado')?.total || 0))}
                </span>
              </div>
            </div>
          </div>

          {/* Cards de Resumo Rápido */}
          <div className="stats-grid mb-4">
            <div className="stat-card">
              <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)' }}>
                <FiDollarSign />
              </div>
              <div className="stat-info">
                <span className="stat-label">Valor Inicial</span>
                <span className="stat-value">{formatCurrency(openRegister.opening_amount)}</span>
              </div>
            </div>

            <div 
              className="stat-card" 
              style={{ cursor: 'pointer', transition: 'transform 0.2s' }}
              onClick={() => setShowSalesModal(true)}
              onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
              onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
              title="Clique para ver as vendas"
            >
              <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}>
                <FiList />
              </div>
              <div className="stat-info">
                <span className="stat-label">Vendas</span>
                <span className="stat-value">{summary.sales.count}</span>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)' }}>
                <FiDollarSign />
              </div>
              <div className="stat-info">
                <span className="stat-label">Total Vendido</span>
                <span className="stat-value">{formatCurrency(summary.sales.total)}</span>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
                <FiDollarSign />
              </div>
              <div className="stat-info">
                <span className="stat-label">Esperado em Caixa</span>
                <span className="stat-value">{formatCurrency(summary.expectedAmount)}</span>
              </div>
            </div>
          </div>

          {/* Vendas por forma de pagamento */}
          <div className="card mb-4">
            <div className="card-header">
              <h3 className="card-title">Vendas por Forma de Pagamento</h3>
            </div>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Forma de Pagamento</th>
                    <th>Quantidade</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.sales.byPaymentMethod.map(item => (
                    <tr key={item.payment_method}>
                      <td>
                        {item.payment_method === 'cash' && 'Dinheiro'}
                        {item.payment_method === 'credit' && 'Crédito'}
                        {item.payment_method === 'debit' && 'Débito'}
                        {item.payment_method === 'pix' && 'PIX'}
                      </td>
                      <td>{item.count}</td>
                      <td>{formatCurrency(item.total)}</td>
                    </tr>
                  ))}
                  {summary.sales.byPaymentMethod.length === 0 && (
                    <tr>
                      <td colSpan={3} className="text-center text-muted">
                        Nenhuma venda realizada
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Movimentações */}
          {summary.movements.list.length > 0 && (
            <div className="card mb-4">
              <div className="card-header">
                <h3 className="card-title">Movimentações</h3>
              </div>
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Tipo</th>
                      <th>Valor</th>
                      <th>Motivo</th>
                      <th>Responsável</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.movements.list.map(mov => (
                      <tr key={mov.id}>
                        <td>
                          <span className={`badge ${mov.type === 'withdrawal' ? 'badge-danger' : 'badge-success'}`}>
                            {mov.type === 'withdrawal' ? 'Sangria' : 'Suprimento'}
                          </span>
                        </td>
                        <td className={mov.type === 'withdrawal' ? 'text-danger' : 'text-success'}>
                          {mov.type === 'withdrawal' ? '-' : '+'}{formatCurrency(mov.amount)}
                        </td>
                        <td>{mov.reason}</td>
                        <td>{mov.user_name}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Recebimentos de Fiado (separado do caixa) */}
          <div className="card mb-4" style={{ borderLeft: '4px solid #f59e0b' }}>
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 className="card-title" style={{ color: '#b45309' }}>
                Recebimentos de Fiado (Não entra no caixa)
              </h3>
              <span className="badge" style={{ background: '#fef3c7', color: '#92400e', fontSize: '1rem', padding: '0.5rem 1rem' }}>
                Total: {formatCurrency(fiadoPayments.summary.total)}
              </span>
            </div>
            {fiadoPayments.payments.length > 0 ? (
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Cliente</th>
                      <th>Valor</th>
                      <th>Forma Pgto</th>
                      <th>Recebido por</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fiadoPayments.payments.map(payment => (
                      <tr key={payment.id}>
                        <td><strong>{payment.customer_name}</strong></td>
                        <td className="text-success" style={{ fontWeight: 600 }}>
                          {formatCurrency(payment.amount)}
                        </td>
                        <td>
                          {payment.payment_method === 'cash' && 'Dinheiro'}
                          {payment.payment_method === 'credit' && 'Crédito'}
                          {payment.payment_method === 'debit' && 'Débito'}
                          {payment.payment_method === 'pix' && 'PIX'}
                        </td>
                        <td>{payment.user_name}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-muted text-center" style={{ padding: '1rem' }}>
                Nenhum recebimento de fiado hoje
              </p>
            )}
          </div>

          {/* Timeline de Movimentações */}
          <div className="card" style={{ borderLeft: '4px solid #3b82f6' }}>
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 className="card-title" style={{ color: '#1d4ed8' }}>
                <FiClock style={{ marginRight: 8 }} />
                Movimentação do Dia
              </h3>
              <span className="badge" style={{ background: '#dbeafe', color: '#1d4ed8', fontSize: '1rem', padding: '0.5rem 1rem' }}>
                Saldo: {formatCurrency(calculateRunningBalance())}
              </span>
            </div>
            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {timeline.length > 0 ? (
                <div style={{ padding: '1rem' }}>
                  {timeline.map((item, index) => (
                    <div 
                      key={item.id} 
                      style={{ 
                        display: 'flex', 
                        alignItems: 'flex-start', 
                        gap: '1rem',
                        paddingBottom: index < timeline.length - 1 ? '1rem' : 0,
                        borderLeft: index < timeline.length - 1 ? '2px solid #e5e7eb' : 'none',
                        marginLeft: '0.75rem',
                        paddingLeft: '1.5rem',
                        position: 'relative'
                      }}
                    >
                      {/* Ícone */}
                      <div style={{ 
                        position: 'absolute',
                        left: '-0.75rem',
                        width: '1.5rem',
                        height: '1.5rem',
                        borderRadius: '50%',
                        background: item.color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontSize: '0.75rem'
                      }}>
                        {item.icon === 'unlock' && <FiUnlock size={12} />}
                        {item.icon === 'cart' && <FiShoppingCart size={12} />}
                        {item.icon === 'arrow-up' && <FiArrowUpCircle size={12} />}
                        {item.icon === 'arrow-down' && <FiArrowDownCircle size={12} />}
                        {item.icon === 'user' && <FiUser size={12} />}
                        {item.icon === 'x' && <span>×</span>}
                      </div>
                      
                      {/* Conteúdo */}
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: 500, color: '#374151' }}>{item.description}</span>
                          <span style={{ 
                            fontWeight: 600, 
                            color: item.type === 'withdrawal' || item.type === 'cancelled' ? '#dc2626' : 
                                   item.type === 'fiado-payment' ? '#f59e0b' : '#16a34a'
                          }}>
                            {item.type === 'withdrawal' ? '-' : ''}
                            {formatCurrency(item.value)}
                          </span>
                        </div>
                        <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                          {formatTime(item.time)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted text-center" style={{ padding: '2rem' }}>
                  Nenhuma movimentação ainda
                </p>
              )}
            </div>
          </div>
        </>
      )}

      {/* Modal Abrir Caixa */}
      {showOpenModal && (
        <div className="modal-overlay" onClick={() => setShowOpenModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Abrir Caixa</h3>
              <button className="modal-close" onClick={() => setShowOpenModal(false)}>×</button>
            </div>
            <form onSubmit={handleOpenRegister}>
              <div className="modal-body">
                <div className="flex gap-3">
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Número do Caixa</label>
                    <select
                      className="form-input form-select"
                      value={openForm.registerNumber}
                      onChange={(e) => setOpenForm({ ...openForm, registerNumber: e.target.value })}
                    >
                      <option value="1">Caixa 1</option>
                      <option value="2">Caixa 2</option>
                      <option value="3">Caixa ADM</option>
                    </select>
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Turno</label>
                    <select
                      className="form-input form-select"
                      value={openForm.shift}
                      onChange={(e) => setOpenForm({ ...openForm, shift: e.target.value })}
                    >
                      <option value="1">Turno 1 (Manhã)</option>
                      <option value="2">Turno 2 (Tarde)</option>
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Valor Inicial (R$)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    className="form-input"
                    placeholder="0,00"
                    value={formatCurrencyInput(openForm.openingAmount)}
                    onChange={(e) => setOpenForm({ ...openForm, openingAmount: parseCurrencyInput(e.target.value) })}
                    required
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowOpenModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={openingRegister}>
                  {openingRegister ? 'Abrindo...' : 'Abrir Caixa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Fechar Caixa - Detalhado */}
      {showCloseModal && (
        <div className="modal-overlay" onClick={() => setShowCloseModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 600 }}>
            <div className="modal-header">
              <h3 className="modal-title">Fechamento de Caixa</h3>
              <button className="modal-close" onClick={() => setShowCloseModal(false)}>×</button>
            </div>
            <form onSubmit={handleCloseRegister}>
              <div className="modal-body">
                {/* Tabela detalhada de movimentação */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                    <tbody>
                      {/* Início */}
                      <tr style={{ background: '#f0fdf4' }}>
                        <td style={{ padding: '0.75rem', fontWeight: 600, borderBottom: '1px solid #e5e7eb' }}>
                          INÍCIO
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'right', borderBottom: '1px solid #e5e7eb', color: '#16a34a', fontWeight: 600 }}>
                          {formatCurrency(openRegister?.opening_amount || 0)}
                        </td>
                      </tr>
                      
                      {/* Movimentos */}
                      <tr style={{ background: '#f9fafb' }}>
                        <td colSpan="2" style={{ padding: '0.5rem 0.75rem', fontWeight: 600, color: '#6b7280', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                          Movimentação
                        </td>
                      </tr>
                      
                      {/* Vendas Dinheiro */}
                      <tr>
                        <td style={{ padding: '0.5rem 0.75rem 0.5rem 1.5rem', borderBottom: '1px solid #f3f4f6' }}>
                          (+) Vendas em Dinheiro
                        </td>
                        <td style={{ padding: '0.5rem 0.75rem', textAlign: 'right', borderBottom: '1px solid #f3f4f6', color: '#16a34a' }}>
                          {formatCurrency(summary?.sales?.byMethod?.find(m => m.method === 'cash')?.total || 0)}
                        </td>
                      </tr>
                      
                      {/* Recebimentos Fiado */}
                      <tr>
                        <td style={{ padding: '0.5rem 0.75rem 0.5rem 1.5rem', borderBottom: '1px solid #f3f4f6' }}>
                          (+) Recebimentos Fiado
                        </td>
                        <td style={{ padding: '0.5rem 0.75rem', textAlign: 'right', borderBottom: '1px solid #f3f4f6', color: '#16a34a' }}>
                          {formatCurrency(fiadoPayments?.summary?.total || 0)}
                        </td>
                      </tr>
                      
                      {/* Suprimentos */}
                      <tr>
                        <td style={{ padding: '0.5rem 0.75rem 0.5rem 1.5rem', borderBottom: '1px solid #f3f4f6' }}>
                          (+) Suprimentos
                        </td>
                        <td style={{ padding: '0.5rem 0.75rem', textAlign: 'right', borderBottom: '1px solid #f3f4f6', color: '#16a34a' }}>
                          {formatCurrency(summary?.movements?.deposits || 0)}
                        </td>
                      </tr>
                      
                      {/* Sangrias */}
                      <tr>
                        <td style={{ padding: '0.5rem 0.75rem 0.5rem 1.5rem', borderBottom: '1px solid #f3f4f6' }}>
                          (-) Sangrias
                        </td>
                        <td style={{ padding: '0.5rem 0.75rem', textAlign: 'right', borderBottom: '1px solid #f3f4f6', color: '#dc2626' }}>
                          {formatCurrency(summary?.movements?.withdrawals || 0)}
                        </td>
                      </tr>
                      
                      {/* Separador */}
                      <tr style={{ background: '#fef3c7' }}>
                        <td style={{ padding: '0.75rem', fontWeight: 600, borderTop: '2px solid #d97706', borderBottom: '1px solid #e5e7eb' }}>
                          ESPERADO EM CAIXA
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'right', borderTop: '2px solid #d97706', borderBottom: '1px solid #e5e7eb', color: '#d97706', fontWeight: 700, fontSize: '1.125rem' }}>
                          {formatCurrency(summary?.expectedAmount || 0)}
                        </td>
                      </tr>
                      
                      {/* Resumo de outras formas de pagamento */}
                      <tr style={{ background: '#f9fafb' }}>
                        <td colSpan="2" style={{ padding: '0.5rem 0.75rem', fontWeight: 600, color: '#6b7280', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                          Outras Formas de Pagamento
                        </td>
                      </tr>
                      
                      {/* Cartão Crédito */}
                      {(summary?.sales?.byMethod?.find(m => m.method === 'credit')?.total || 0) > 0 && (
                        <tr>
                          <td style={{ padding: '0.5rem 0.75rem 0.5rem 1.5rem', borderBottom: '1px solid #f3f4f6' }}>
                            Cartão Crédito
                          </td>
                          <td style={{ padding: '0.5rem 0.75rem', textAlign: 'right', borderBottom: '1px solid #f3f4f6', color: '#6b7280' }}>
                            {formatCurrency(summary?.sales?.byMethod?.find(m => m.method === 'credit')?.total || 0)}
                          </td>
                        </tr>
                      )}
                      
                      {/* Cartão Débito */}
                      {(summary?.sales?.byMethod?.find(m => m.method === 'debit')?.total || 0) > 0 && (
                        <tr>
                          <td style={{ padding: '0.5rem 0.75rem 0.5rem 1.5rem', borderBottom: '1px solid #f3f4f6' }}>
                            Cartão Débito
                          </td>
                          <td style={{ padding: '0.5rem 0.75rem', textAlign: 'right', borderBottom: '1px solid #f3f4f6', color: '#6b7280' }}>
                            {formatCurrency(summary?.sales?.byMethod?.find(m => m.method === 'debit')?.total || 0)}
                          </td>
                        </tr>
                      )}
                      
                      {/* PIX */}
                      {(summary?.sales?.byMethod?.find(m => m.method === 'pix')?.total || 0) > 0 && (
                        <tr>
                          <td style={{ padding: '0.5rem 0.75rem 0.5rem 1.5rem', borderBottom: '1px solid #f3f4f6' }}>
                            PIX
                          </td>
                          <td style={{ padding: '0.5rem 0.75rem', textAlign: 'right', borderBottom: '1px solid #f3f4f6', color: '#6b7280' }}>
                            {formatCurrency(summary?.sales?.byMethod?.find(m => m.method === 'pix')?.total || 0)}
                          </td>
                        </tr>
                      )}
                      
                      {/* Fiado */}
                      {(summary?.sales?.byMethod?.find(m => m.method === 'fiado')?.total || 0) > 0 && (
                        <tr>
                          <td style={{ padding: '0.5rem 0.75rem 0.5rem 1.5rem', borderBottom: '1px solid #f3f4f6' }}>
                            Fiado (a receber)
                          </td>
                          <td style={{ padding: '0.5rem 0.75rem', textAlign: 'right', borderBottom: '1px solid #f3f4f6', color: '#f59e0b' }}>
                            {formatCurrency(summary?.sales?.byMethod?.find(m => m.method === 'fiado')?.total || 0)}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Valor contado */}
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600 }}>Valor Contado em Caixa (R$)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    className="form-input"
                    placeholder="0,00"
                    value={formatCurrencyInput(closeForm.closingAmount)}
                    onChange={(e) => setCloseForm({ ...closeForm, closingAmount: parseCurrencyInput(e.target.value) })}
                    required
                    style={{ fontSize: '1.25rem', fontWeight: 600, textAlign: 'right' }}
                  />
                </div>
                
                {/* Diferença */}
                {closeForm.closingAmount && (
                  <div style={{ 
                    padding: '0.75rem', 
                    borderRadius: '0.5rem',
                    marginBottom: '1rem',
                    background: Math.abs(centsToDecimal(closeForm.closingAmount) - (summary?.expectedAmount || 0)) < 0.01 ? '#f0fdf4' : '#fef2f2',
                    border: `1px solid ${Math.abs(centsToDecimal(closeForm.closingAmount) - (summary?.expectedAmount || 0)) < 0.01 ? '#86efac' : '#fecaca'}`
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 500 }}>Diferença:</span>
                      <span style={{ 
                        fontWeight: 700, 
                        fontSize: '1.125rem',
                        color: Math.abs(centsToDecimal(closeForm.closingAmount) - (summary?.expectedAmount || 0)) < 0.01 ? '#16a34a' : '#dc2626'
                      }}>
                        {formatCurrency(centsToDecimal(closeForm.closingAmount) - (summary?.expectedAmount || 0))}
                      </span>
                    </div>
                    {Math.abs(centsToDecimal(closeForm.closingAmount) - (summary?.expectedAmount || 0)) >= 0.01 && (
                      <p style={{ fontSize: '0.75rem', color: '#dc2626', marginTop: '0.25rem' }}>
                        {centsToDecimal(closeForm.closingAmount) > (summary?.expectedAmount || 0) ? 'Sobra no caixa' : 'Falta no caixa'}
                      </p>
                    )}
                  </div>
                )}
                
                <div className="form-group">
                  <label className="form-label">Observações</label>
                  <textarea
                    className="form-input"
                    rows="2"
                    value={closeForm.notes}
                    onChange={(e) => setCloseForm({ ...closeForm, notes: e.target.value })}
                    placeholder="Observações sobre o fechamento..."
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCloseModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-danger" disabled={closingRegister}>
                  {closingRegister ? 'Fechando...' : 'Confirmar Fechamento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Movimentação */}
      {showMovementModal && (
        <div className="modal-overlay" onClick={() => setShowMovementModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                {movementType === 'withdrawal' ? 'Registrar Sangria' : 'Registrar Suprimento'}
              </h3>
              <button className="modal-close" onClick={() => setShowMovementModal(false)}>×</button>
            </div>
            <form onSubmit={handleMovement}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Valor (R$)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    className="form-input"
                    placeholder="0,00"
                    value={formatCurrencyInput(movementForm.amount)}
                    onChange={(e) => setMovementForm({ ...movementForm, amount: parseCurrencyInput(e.target.value) })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Motivo</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Ex: Troco para outro caixa"
                    value={movementForm.reason}
                    onChange={(e) => setMovementForm({ ...movementForm, reason: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowMovementModal(false)}>
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className={`btn ${movementType === 'withdrawal' ? 'btn-danger' : 'btn-success'}`}
                  disabled={submitting}
                >
                  {submitting ? 'Processando...' : 'Confirmar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Lista de Vendas */}
      {showSalesModal && (
        <div className="modal-overlay" onClick={() => setShowSalesModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '700px', maxHeight: '80vh' }}>
            <div className="modal-header">
              <h3 className="modal-title">
                <FiList style={{ marginRight: 8 }} />
                Vendas do Caixa ({salesList.length})
              </h3>
              <button className="modal-close" onClick={() => setShowSalesModal(false)}>×</button>
            </div>
            <div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
              {salesList.length > 0 ? (
                <div className="table-container">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Hora</th>
                        <th>Valor</th>
                        <th>Pagamento</th>
                        <th>Status</th>
                        <th>Operador</th>
                      </tr>
                    </thead>
                    <tbody>
                      {salesList.map(sale => (
                        <tr key={sale.id} style={{ opacity: sale.status === 'cancelled' ? 0.5 : 1 }}>
                          <td>
                            {new Date(sale.created_at.includes('Z') ? sale.created_at : sale.created_at + 'Z').toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })}
                          </td>
                          <td style={{ fontWeight: 600, color: sale.status === 'cancelled' ? '#dc2626' : '#111' }}>
                            {sale.status === 'cancelled' && <s>{formatCurrency(sale.total)}</s>}
                            {sale.status !== 'cancelled' && formatCurrency(sale.total)}
                          </td>
                          <td>
                            {sale.payment_method === 'cash' && 'Dinheiro'}
                            {sale.payment_method === 'credit' && 'Crédito'}
                            {sale.payment_method === 'debit' && 'Débito'}
                            {sale.payment_method === 'pix' && 'PIX'}
                            {sale.payment_method === 'fiado' && <span style={{ color: '#f59e0b' }}>Fiado</span>}
                          </td>
                          <td>
                            {sale.status === 'completed' && <span className="badge badge-success">OK</span>}
                            {sale.status === 'cancelled' && <span className="badge badge-danger">Cancelada</span>}
                          </td>
                          <td>{sale.user_name}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-center text-muted" style={{ padding: '2rem' }}>
                  Nenhuma venda realizada neste caixa
                </p>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowSalesModal(false)}>
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CashRegister;
