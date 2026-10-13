import { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { 
  FiDollarSign, 
  FiUser, 
  FiSearch, 
  FiClock,
  FiCheckCircle,
  FiEye
} from 'react-icons/fi';

function Receivables() {
  const { isManager } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal de pagamento
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [paymentData, setPaymentData] = useState({
    amount: '',
    payment_method: 'cash',
    notes: ''
  });
  
  // Modal de histórico
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [customerHistory, setCustomerHistory] = useState(null);
  
  // Estado para evitar clique duplo
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadCustomersWithDebt();
  }, []);

  const loadCustomersWithDebt = async () => {
    try {
      const response = await api.get('/customers?withDebt=true');
      setCustomers(response.data);
    } catch (error) {
      toast.error('Erro ao carregar contas a receber');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (term) => {
    setSearchTerm(term);
    
    if (term.length < 2) {
      loadCustomersWithDebt();
      return;
    }
    
    try {
      const response = await api.get(`/customers/search/${encodeURIComponent(term)}`);
      // Filtrar apenas os que têm débito
      setCustomers(response.data.filter(c => c.balance > 0));
    } catch (error) {
      console.error('Erro na busca:', error);
    }
  };

  const openPaymentModal = (customer) => {
    setSelectedCustomer(customer);
    setPaymentData({
      amount: customer.balance.toFixed(2),
      payment_method: 'cash',
      notes: ''
    });
    setShowPaymentModal(true);
  };

  const openHistoryModal = async (customer) => {
    try {
      const response = await api.get(`/customers/${customer.id}/history`);
      setCustomerHistory(response.data);
      setShowHistoryModal(true);
    } catch (error) {
      toast.error('Erro ao carregar histórico');
    }
  };

  const handlePayment = async (e) => {
    e.preventDefault();
    
    if (submitting) return; // Evita clique duplo
    
    const amount = parseFloat(paymentData.amount);
    
    if (amount <= 0) {
      toast.error('Valor deve ser maior que zero');
      return;
    }
    
    if (amount > selectedCustomer.balance) {
      toast.error(`Valor maior que o débito (R$ ${selectedCustomer.balance.toFixed(2)})`);
      return;
    }

    setSubmitting(true);

    try {
      await api.post(`/customers/${selectedCustomer.id}/payment`, {
        amount,
        payment_method: paymentData.payment_method,
        notes: paymentData.notes
      });
      
      toast.success('Pagamento registrado com sucesso!');
      setShowPaymentModal(false);
      loadCustomersWithDebt();
    } catch (error) {
      const message = error.response?.data?.message || 'Erro ao registrar pagamento';
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

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const utcDate = dateStr.includes('Z') || dateStr.includes('+') ? dateStr : dateStr + 'Z';
    return new Date(utcDate).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Sao_Paulo'
    });
  };

  const formatPhone = (phone) => {
    if (!phone) return '-';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 11) {
      return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    } else if (cleaned.length === 10) {
      return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    }
    return phone;
  };

  const getPaymentMethodLabel = (method) => {
    const labels = {
      cash: 'Dinheiro',
      credit: 'Crédito',
      debit: 'Débito',
      pix: 'PIX',
      fiado: 'Fiado'
    };
    return labels[method] || method;
  };

  // Calcular totais
  const totalDebt = customers.reduce((sum, c) => sum + (c.balance || 0), 0);

  return (
    <div className="receivables-page">
      <header className="page-header flex justify-between items-center">
        <div>
          <h1>Contas a Receber</h1>
          <p>Gerencie os débitos dos clientes (fiado)</p>
        </div>
      </header>

      {/* Card de resumo */}
      <div className="card mb-4" style={{ background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)' }}>
        <div className="flex items-center gap-4">
          <div className="icon-box" style={{ background: '#f59e0b', color: 'white', width: 60, height: 60 }}>
            <FiDollarSign size={28} />
          </div>
          <div>
            <p style={{ color: '#92400e', fontSize: '0.875rem' }}>Total a Receber</p>
            <p style={{ color: '#78350f', fontSize: '2rem', fontWeight: 700 }}>{formatCurrency(totalDebt)}</p>
            <p style={{ color: '#a16207', fontSize: '0.875rem' }}>{customers.length} cliente(s) com débito</p>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="card mb-4">
        <div className="flex gap-4" style={{ flexWrap: 'wrap' }}>
          <div className="form-group" style={{ flex: 1, minWidth: 200 }}>
            <div className="input-icon" style={{ position: 'relative' }}>
              <FiSearch style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
              <input
                type="text"
                className="form-input"
                placeholder="Buscar cliente..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                style={{ paddingLeft: '2.5rem' }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Lista de clientes com débito */}
      <div className="card">
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Telefone</th>
                <th>Limite</th>
                <th>Débito</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {customers.map(customer => (
                <tr key={customer.id}>
                  <td>
                    <div className="flex items-center gap-2">
                      <FiUser style={{ color: '#9ca3af' }} />
                      <strong>{customer.name}</strong>
                    </div>
                  </td>
                  <td>{formatPhone(customer.phone)}</td>
                  <td>{formatCurrency(customer.credit_limit)}</td>
                  <td>
                    <span className="text-danger font-bold" style={{ fontSize: '1.1rem' }}>
                      {formatCurrency(customer.balance)}
                    </span>
                  </td>
                  <td>
                    <div className="flex gap-2">
                      <button 
                        className="btn btn-sm btn-secondary"
                        onClick={() => openHistoryModal(customer)}
                        title="Ver histórico"
                      >
                        <FiEye />
                      </button>
                      {isManager && (
                        <button 
                          className="btn btn-sm btn-success"
                          onClick={() => openPaymentModal(customer)}
                          title="Registrar pagamento"
                        >
                          <FiCheckCircle />
                          Receber
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {customers.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center text-muted">
                    <div style={{ padding: '2rem' }}>
                      <FiCheckCircle size={48} style={{ color: '#10b981', marginBottom: '1rem' }} />
                      <p>Nenhum cliente com débito pendente!</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Pagamento */}
      {showPaymentModal && selectedCustomer && (
        <div className="modal-overlay" onClick={() => setShowPaymentModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                <FiDollarSign style={{ marginRight: 8 }} />
                Registrar Pagamento
              </h3>
              <button className="modal-close" onClick={() => setShowPaymentModal(false)}>×</button>
            </div>
            <form onSubmit={handlePayment}>
              <div className="modal-body">
                <div className="card mb-3" style={{ background: '#f3f4f6' }}>
                  <div className="flex items-center gap-3">
                    <FiUser size={24} style={{ color: '#6b7280' }} />
                    <div>
                      <strong>{selectedCustomer.name}</strong>
                      <p className="text-muted" style={{ margin: 0 }}>
                        Débito atual: <span className="text-danger font-bold">{formatCurrency(selectedCustomer.balance)}</span>
                      </p>
                    </div>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Valor do Pagamento *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={selectedCustomer.balance}
                    className="form-input"
                    value={paymentData.amount}
                    onChange={(e) => setPaymentData({ ...paymentData, amount: e.target.value })}
                    required
                    autoFocus
                  />
                  <small className="text-muted">
                    Máximo: {formatCurrency(selectedCustomer.balance)}
                  </small>
                </div>

                <div className="form-group">
                  <label className="form-label">Forma de Pagamento *</label>
                  <select
                    className="form-input form-select"
                    value={paymentData.payment_method}
                    onChange={(e) => setPaymentData({ ...paymentData, payment_method: e.target.value })}
                  >
                    <option value="cash">Dinheiro</option>
                    <option value="pix">PIX</option>
                    <option value="debit">Débito</option>
                    <option value="credit">Crédito</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Observações</label>
                  <textarea
                    className="form-input"
                    rows="2"
                    value={paymentData.notes}
                    onChange={(e) => setPaymentData({ ...paymentData, notes: e.target.value })}
                    placeholder="Anotações sobre o pagamento (opcional)"
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowPaymentModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-success" disabled={submitting}>
                  {submitting ? (
                    'Processando...'
                  ) : (
                    <>
                      <FiCheckCircle />
                      Confirmar Pagamento
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Histórico */}
      {showHistoryModal && customerHistory && (
        <div className="modal-overlay" onClick={() => setShowHistoryModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 600 }}>
            <div className="modal-header">
              <h3 className="modal-title">
                <FiClock style={{ marginRight: 8 }} />
                Histórico - {customerHistory.customer.name}
              </h3>
              <button className="modal-close" onClick={() => setShowHistoryModal(false)}>×</button>
            </div>
            <div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
              <div className="card mb-3" style={{ background: '#fef3c7' }}>
                <div className="flex justify-between items-center">
                  <span>Débito Atual:</span>
                  <strong className="text-danger" style={{ fontSize: '1.25rem' }}>
                    {formatCurrency(customerHistory.customer.balance)}
                  </strong>
                </div>
              </div>

              <h4 style={{ marginBottom: '0.75rem', color: '#374151' }}>
                <FiDollarSign style={{ marginRight: 4 }} />
                Compras Fiado ({customerHistory.sales.length})
              </h4>
              {customerHistory.sales.length > 0 ? (
                <div className="table-container mb-4">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Data</th>
                        <th>Valor</th>
                        <th>Operador</th>
                      </tr>
                    </thead>
                    <tbody>
                      {customerHistory.sales.map(sale => (
                        <tr key={sale.id}>
                          <td>{formatDate(sale.created_at)}</td>
                          <td className="text-danger">{formatCurrency(sale.total)}</td>
                          <td>{sale.user_name}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-muted mb-4">Nenhuma compra fiado registrada</p>
              )}

              <h4 style={{ marginBottom: '0.75rem', color: '#374151' }}>
                <FiCheckCircle style={{ marginRight: 4 }} />
                Pagamentos ({customerHistory.payments.length})
              </h4>
              {customerHistory.payments.length > 0 ? (
                <div className="table-container">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Data</th>
                        <th>Valor</th>
                        <th>Forma</th>
                        <th>Recebido por</th>
                      </tr>
                    </thead>
                    <tbody>
                      {customerHistory.payments.map(payment => (
                        <tr key={payment.id}>
                          <td>{formatDate(payment.created_at)}</td>
                          <td className="text-success">{formatCurrency(payment.amount)}</td>
                          <td>{getPaymentMethodLabel(payment.payment_method)}</td>
                          <td>{payment.user_name}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-muted">Nenhum pagamento registrado</p>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowHistoryModal(false)}>
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Receivables;
