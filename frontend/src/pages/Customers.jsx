import { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { 
  FiPlus, 
  FiEdit2, 
  FiTrash2, 
  FiSearch, 
  FiUsers, 
  FiDollarSign,
  FiPhone,
  FiMapPin,
  FiMessageCircle,
  FiClock,
  FiShoppingBag,
  FiCalendar,
  FiCheckCircle,
  FiXCircle
} from 'react-icons/fi';
import { FaWhatsapp } from 'react-icons/fa';

function Customers() {
  const { isManager } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerHistory, setCustomerHistory] = useState({ sales: [], payments: [], summary: {} });
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    whatsapp: '',
    document: '',
    credit_limit: '',
    address: '',
    neighborhood: '',
    city: '',
    notes: ''
  });

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    try {
      const response = await api.get('/customers');
      setCustomers(response.data);
    } catch (error) {
      toast.error('Erro ao carregar clientes');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (term) => {
    setSearchTerm(term);
    
    if (term.length < 2) {
      loadCustomers();
      return;
    }
    
    try {
      const response = await api.get(`/customers/search/${encodeURIComponent(term)}`);
      setCustomers(response.data);
    } catch (error) {
      console.error('Erro na busca:', error);
    }
  };

  const openModal = (customer = null) => {
    if (customer) {
      setEditingCustomer(customer);
      setFormData({
        name: customer.name,
        phone: customer.phone || '',
        whatsapp: customer.whatsapp || '',
        document: customer.document || '',
        credit_limit: customer.credit_limit?.toString() || '',
        address: customer.address || '',
        neighborhood: customer.neighborhood || '',
        city: customer.city || '',
        notes: customer.notes || ''
      });
    } else {
      setEditingCustomer(null);
      setFormData({
        name: '',
        phone: '',
        whatsapp: '',
        document: '',
        credit_limit: '',
        address: '',
        neighborhood: '',
        city: '',
        notes: ''
      });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const data = {
      ...formData,
      credit_limit: parseFloat(formData.credit_limit) || 0
    };

    try {
      if (editingCustomer) {
        await api.put(`/customers/${editingCustomer.id}`, data);
        toast.success('Cliente atualizado!');
      } else {
        await api.post('/customers', data);
        toast.success('Cliente cadastrado!');
      }
      setShowModal(false);
      loadCustomers();
    } catch (error) {
      const message = error.response?.data?.message || 'Erro ao salvar cliente';
      toast.error(message);
    }
  };

  const openWhatsApp = (phone) => {
    if (!phone) return;
    const cleaned = phone.replace(/\D/g, '');
    const number = cleaned.startsWith('55') ? cleaned : `55${cleaned}`;
    window.open(`https://wa.me/${number}`, '_blank');
  };

  const openHistory = async (customer) => {
    setSelectedCustomer(customer);
    setShowHistoryModal(true);
    setLoadingHistory(true);
    
    try {
      const response = await api.get(`/customers/${customer.id}/history`);
      setCustomerHistory(response.data);
    } catch (error) {
      toast.error('Erro ao carregar histórico');
      console.error('Erro ao carregar histórico:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    // Adiciona Z se não tiver timezone para tratar como UTC
    const utcDate = dateStr.endsWith('Z') ? dateStr : dateStr + 'Z';
    return new Date(utcDate).toLocaleDateString('pt-BR', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric',
      timeZone: 'America/Sao_Paulo'
    });
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '-';
    const utcDate = dateStr.endsWith('Z') ? dateStr : dateStr + 'Z';
    return new Date(utcDate).toLocaleString('pt-BR', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Sao_Paulo'
    });
  };

  const handleDelete = async (customer) => {
    if (customer.balance > 0) {
      toast.error('Não é possível desativar cliente com débito pendente');
      return;
    }

    if (!window.confirm(`Deseja desativar o cliente "${customer.name}"?`)) {
      return;
    }

    try {
      await api.delete(`/customers/${customer.id}`);
      toast.success('Cliente desativado!');
      loadCustomers();
    } catch (error) {
      const message = error.response?.data?.message || 'Erro ao desativar cliente';
      toast.error(message);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  const formatPhone = (phone) => {
    if (!phone) return '-';
    // Formatar telefone se tiver 10 ou 11 dígitos
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 11) {
      return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    } else if (cleaned.length === 10) {
      return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    }
    return phone;
  };

  // Calcular totais
  const totalDebt = customers.reduce((sum, c) => sum + (c.balance || 0), 0);
  const customersWithDebt = customers.filter(c => c.balance > 0).length;

  return (
    <div className="customers-page">
      <header className="page-header flex justify-between items-center">
        <div>
          <h1>Clientes</h1>
          <p>Gerencie os clientes para venda fiado</p>
        </div>
        {isManager && (
          <button className="btn btn-primary" onClick={() => openModal()}>
            <FiPlus />
            Novo Cliente
          </button>
        )}
      </header>

      {/* Cards de resumo */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="icon-box" style={{ background: '#e0e7ff', color: '#4f46e5' }}>
              <FiUsers size={24} />
            </div>
            <div>
              <p className="text-muted text-sm">Total de Clientes</p>
              <p className="text-xl font-bold">{customers.length}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="icon-box" style={{ background: '#fef3c7', color: '#d97706' }}>
              <FiUsers size={24} />
            </div>
            <div>
              <p className="text-muted text-sm">Com Débito</p>
              <p className="text-xl font-bold">{customersWithDebt}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="icon-box" style={{ background: '#fee2e2', color: '#dc2626' }}>
              <FiDollarSign size={24} />
            </div>
            <div>
              <p className="text-muted text-sm">Total a Receber</p>
              <p className="text-xl font-bold">{formatCurrency(totalDebt)}</p>
            </div>
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

      {/* Tabela */}
      <div className="card">
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Contato</th>
                <th>Endereço</th>
                <th>Limite</th>
                <th>Débito</th>
                <th>Disponível</th>
                {isManager && <th>Ações</th>}
              </tr>
            </thead>
            <tbody>
              {customers.map(customer => {
                const available = (customer.credit_limit || 0) - (customer.balance || 0);
                const whatsappNumber = customer.whatsapp || customer.phone;
                return (
                  <tr key={customer.id}>
                    <td>
                      <div>
                        <strong>{customer.name}</strong>
                        {customer.document && (
                          <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                            {customer.document}
                          </div>
                        )}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        {customer.phone && (
                          <span style={{ fontSize: '0.875rem' }}>
                            <FiPhone size={12} style={{ marginRight: 4 }} />
                            {formatPhone(customer.phone)}
                          </span>
                        )}
                        {whatsappNumber && (
                          <button
                            className="btn btn-sm"
                            style={{ 
                              background: '#25D366', 
                              color: 'white', 
                              padding: '2px 8px',
                              fontSize: '0.75rem',
                              width: 'fit-content'
                            }}
                            onClick={() => openWhatsApp(whatsappNumber)}
                            title="Abrir WhatsApp"
                          >
                            <FaWhatsapp size={12} style={{ marginRight: 4 }} />
                            WhatsApp
                          </button>
                        )}
                      </div>
                    </td>
                    <td>
                      {customer.address || customer.neighborhood || customer.city ? (
                        <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                          {customer.address && <div>{customer.address}</div>}
                          {(customer.neighborhood || customer.city) && (
                            <div>
                              {customer.neighborhood}{customer.neighborhood && customer.city ? ' - ' : ''}{customer.city}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span style={{ color: '#9ca3af' }}>-</span>
                      )}
                    </td>
                    <td>{formatCurrency(customer.credit_limit)}</td>
                    <td>
                      <span className={customer.balance > 0 ? 'text-danger font-bold' : ''}>
                        {formatCurrency(customer.balance)}
                      </span>
                    </td>
                    <td>
                      <span className={available <= 0 ? 'text-danger' : 'text-success'}>
                        {formatCurrency(available)}
                      </span>
                    </td>
                    {isManager && (
                      <td>
                        <div className="flex gap-2">
                          <button 
                            className="btn btn-sm btn-secondary"
                            onClick={() => openHistory(customer)}
                            title="Ver histórico"
                            style={{ background: '#dbeafe', color: '#2563eb' }}
                          >
                            <FiClock />
                          </button>
                          <button 
                            className="btn btn-sm btn-secondary"
                            onClick={() => openModal(customer)}
                            title="Editar"
                          >
                            <FiEdit2 />
                          </button>
                          <button 
                            className="btn btn-sm btn-danger"
                            onClick={() => handleDelete(customer)}
                            disabled={customer.balance > 0}
                            title={customer.balance > 0 ? 'Cliente com débito pendente' : 'Desativar cliente'}
                          >
                            <FiTrash2 />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
              {customers.length === 0 && (
                <tr>
                  <td colSpan={isManager ? 7 : 6} className="text-center text-muted">
                    Nenhum cliente encontrado
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 600 }}>
            <div className="modal-header">
              <h3 className="modal-title">
                {editingCustomer ? 'Editar Cliente' : 'Novo Cliente'}
              </h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {/* Nome */}
                <div className="form-group">
                  <label className="form-label">Nome *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    autoFocus
                  />
                </div>

                {/* Telefone e WhatsApp */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">
                      <FiPhone size={14} style={{ marginRight: 4 }} />
                      Telefone
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="(00) 00000-0000"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">
                      <FaWhatsapp size={14} style={{ marginRight: 4, color: '#25D366' }} />
                      WhatsApp
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.whatsapp}
                      onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                      placeholder="(00) 00000-0000"
                    />
                    <small className="text-muted">Se vazio, usa o telefone</small>
                  </div>
                </div>

                {/* Documento e Limite */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Documento (CPF/RG)</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.document}
                      onChange={(e) => setFormData({ ...formData, document: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Limite de Crédito</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="form-input"
                      value={formData.credit_limit}
                      onChange={(e) => setFormData({ ...formData, credit_limit: e.target.value })}
                      placeholder="0.00"
                    />
                    <small className="text-muted">0 = sem limite</small>
                  </div>
                </div>

                {/* Endereço */}
                <div className="form-group">
                  <label className="form-label">
                    <FiMapPin size={14} style={{ marginRight: 4 }} />
                    Endereço
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Rua, número"
                  />
                </div>

                {/* Bairro e Cidade */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Bairro</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.neighborhood}
                      onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Cidade</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    />
                  </div>
                </div>

                {/* Observações */}
                <div className="form-group">
                  <label className="form-label">
                    <FiMessageCircle size={14} style={{ marginRight: 4 }} />
                    Observações
                  </label>
                  <textarea
                    className="form-input"
                    rows="3"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Anotações sobre o cliente..."
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingCustomer ? 'Salvar' : 'Cadastrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Histórico */}
      {showHistoryModal && selectedCustomer && (
        <div className="modal-overlay" onClick={() => setShowHistoryModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 800 }}>
            <div className="modal-header">
              <div>
                <h3 className="modal-title">Histórico - {selectedCustomer.name}</h3>
                <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>
                  {selectedCustomer.phone && formatPhone(selectedCustomer.phone)}
                </p>
              </div>
              <button className="modal-close" onClick={() => setShowHistoryModal(false)}>×</button>
            </div>
            <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
              {loadingHistory ? (
                <div style={{ textAlign: 'center', padding: '2rem' }}>
                  <p>Carregando histórico...</p>
                </div>
              ) : (
                <>
                  {/* Resumo */}
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div style={{ padding: '1rem', background: '#fef3c7', borderRadius: '0.5rem' }}>
                      <p style={{ fontSize: '0.75rem', color: '#92400e', margin: 0 }}>Saldo Atual</p>
                      <p style={{ fontSize: '1.25rem', fontWeight: 700, color: '#d97706', margin: 0 }}>
                        {formatCurrency(selectedCustomer.balance)}
                      </p>
                    </div>
                    <div style={{ padding: '1rem', background: '#dbeafe', borderRadius: '0.5rem' }}>
                      <p style={{ fontSize: '0.75rem', color: '#1e40af', margin: 0 }}>Total Compras</p>
                      <p style={{ fontSize: '1.25rem', fontWeight: 700, color: '#2563eb', margin: 0 }}>
                        {formatCurrency(customerHistory.summary?.totalPurchases || 0)}
                      </p>
                    </div>
                    <div style={{ padding: '1rem', background: '#dcfce7', borderRadius: '0.5rem' }}>
                      <p style={{ fontSize: '0.75rem', color: '#166534', margin: 0 }}>Total Pago</p>
                      <p style={{ fontSize: '1.25rem', fontWeight: 700, color: '#16a34a', margin: 0 }}>
                        {formatCurrency(customerHistory.summary?.totalPayments || 0)}
                      </p>
                    </div>
                  </div>

                  {/* Compras Fiado */}
                  <div style={{ marginBottom: '1.5rem' }}>
                    <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', color: '#374151' }}>
                      <FiShoppingBag />
                      Compras Fiado
                    </h4>
                    {customerHistory.sales?.length > 0 ? (
                      <div className="table-container" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                        <table className="table" style={{ fontSize: '0.875rem' }}>
                          <thead style={{ position: 'sticky', top: 0, background: 'white' }}>
                            <tr>
                              <th>Data</th>
                              <th>Itens</th>
                              <th>Status</th>
                              <th style={{ textAlign: 'right' }}>Valor</th>
                            </tr>
                          </thead>
                          <tbody>
                            {customerHistory.sales.map(sale => (
                              <tr key={sale.id}>
                                <td>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <FiCalendar size={14} style={{ color: '#9ca3af' }} />
                                    {formatDateTime(sale.created_at)}
                                  </div>
                                </td>
                                <td>
                                  <div style={{ maxWidth: '300px' }}>
                                    {sale.items?.map((item, idx) => (
                                      <div key={idx} style={{ 
                                        fontSize: '0.75rem', 
                                        padding: '2px 0',
                                        borderBottom: idx < sale.items.length - 1 ? '1px solid #f3f4f6' : 'none'
                                      }}>
                                        <span>{item.quantity}x </span>
                                        <span style={{ color: '#374151' }}>{item.product_name}</span>
                                        <span style={{ color: '#9ca3af', marginLeft: '0.5rem' }}>
                                          {formatCurrency(item.subtotal)}
                                        </span>
                                      </div>
                                    )) || <span style={{ color: '#9ca3af' }}>-</span>}
                                  </div>
                                </td>
                                <td>
                                  <span style={{ 
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.25rem',
                                    padding: '0.25rem 0.5rem',
                                    borderRadius: '9999px',
                                    fontSize: '0.75rem',
                                    fontWeight: 500,
                                    background: sale.status === 'completed' ? '#dcfce7' : sale.status === 'cancelled' ? '#fee2e2' : '#fef3c7',
                                    color: sale.status === 'completed' ? '#166534' : sale.status === 'cancelled' ? '#991b1b' : '#92400e'
                                  }}>
                                    {sale.status === 'completed' && <FiCheckCircle size={12} />}
                                    {sale.status === 'cancelled' && <FiXCircle size={12} />}
                                    {sale.status === 'completed' ? 'Concluída' : sale.status === 'cancelled' ? 'Cancelada' : 'Pendente'}
                                  </span>
                                </td>
                                <td style={{ 
                                  textAlign: 'right', 
                                  fontWeight: 600,
                                  color: sale.status === 'cancelled' ? '#dc2626' : '#374151'
                                }}>
                                  {sale.status === 'cancelled' && <span style={{ textDecoration: 'line-through' }}>{formatCurrency(sale.total)}</span>}
                                  {sale.status !== 'cancelled' && formatCurrency(sale.total)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-muted text-center" style={{ padding: '1rem' }}>
                        Nenhuma compra fiado registrada
                      </p>
                    )}
                  </div>

                  {/* Pagamentos */}
                  <div>
                    <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', color: '#374151' }}>
                      <FiDollarSign />
                      Pagamentos
                    </h4>
                    {customerHistory.payments?.length > 0 ? (
                      <div className="table-container" style={{ maxHeight: '250px', overflowY: 'auto' }}>
                        <table className="table" style={{ fontSize: '0.875rem' }}>
                          <thead style={{ position: 'sticky', top: 0, background: 'white' }}>
                            <tr>
                              <th>Data</th>
                              <th>Forma</th>
                              <th style={{ textAlign: 'right' }}>Valor</th>
                            </tr>
                          </thead>
                          <tbody>
                            {customerHistory.payments.map(payment => (
                              <tr key={payment.id}>
                                <td>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <FiCalendar size={14} style={{ color: '#9ca3af' }} />
                                    {formatDateTime(payment.created_at)}
                                  </div>
                                </td>
                                <td>
                                  <span style={{ 
                                    padding: '0.25rem 0.5rem',
                                    borderRadius: '0.25rem',
                                    fontSize: '0.75rem',
                                    background: '#f3f4f6'
                                  }}>
                                    {payment.payment_method === 'cash' ? 'Dinheiro' :
                                     payment.payment_method === 'pix' ? 'PIX' :
                                     payment.payment_method === 'credit' ? 'Crédito' :
                                     payment.payment_method === 'debit' ? 'Débito' : payment.payment_method}
                                  </span>
                                </td>
                                <td style={{ textAlign: 'right', fontWeight: 600, color: '#16a34a' }}>
                                  {formatCurrency(payment.amount)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-muted text-center" style={{ padding: '1rem' }}>
                        Nenhum pagamento registrado
                      </p>
                    )}
                  </div>
                </>
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

export default Customers;
