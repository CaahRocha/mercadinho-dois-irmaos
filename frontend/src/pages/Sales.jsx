import { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { FiSearch, FiCalendar, FiUser, FiPackage, FiEye, FiX, FiFilter, FiShield } from 'react-icons/fi';
import './Sales.css';

function Sales() {
  const { isManager } = useAuth();
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSale, setSelectedSale] = useState(null);
  
  // Modal de cancelamento com autorização
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelAuthCode, setCancelAuthCode] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [saleToCancel, setSaleToCancel] = useState(null);
  const [adminAuthCode, setAdminAuthCode] = useState('');
  
  // Filtros
  const [filters, setFilters] = useState({
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    productSearch: '',
    status: '',
    period: 'today' // 'today', 'week', 'month', 'year', 'custom'
  });

  // Estatísticas
  const [stats, setStats] = useState({
    total: 0,
    count: 0,
    cancelled: 0
  });

  // Função para calcular datas baseado no período
  const getDatesByPeriod = (period) => {
    const today = new Date();
    let startDate, endDate;
    
    switch (period) {
      case 'today':
        startDate = today.toISOString().split('T')[0];
        endDate = today.toISOString().split('T')[0];
        break;
      case 'week':
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay()); // Domingo
        startDate = weekStart.toISOString().split('T')[0];
        endDate = today.toISOString().split('T')[0];
        break;
      case 'month':
        startDate = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
        endDate = today.toISOString().split('T')[0];
        break;
      case 'year':
        startDate = new Date(today.getFullYear(), 0, 1).toISOString().split('T')[0];
        endDate = today.toISOString().split('T')[0];
        break;
      default:
        return null; // custom - não muda as datas
    }
    
    return { startDate, endDate };
  };

  const handlePeriodChange = (period) => {
    const dates = getDatesByPeriod(period);
    if (dates) {
      setFilters({ ...filters, period, startDate: dates.startDate, endDate: dates.endDate });
    } else {
      setFilters({ ...filters, period });
    }
  };

  useEffect(() => {
    loadSales();
    loadSettings();
  }, [filters.startDate, filters.endDate, filters.status]);

  const loadSettings = async () => {
    try {
      const response = await api.get('/settings');
      if (response.data.admin_auth_code) setAdminAuthCode(response.data.admin_auth_code);
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
    }
  };

  const loadSales = async () => {
    setLoading(true);
    try {
      let url = `/sales?startDate=${filters.startDate}&endDate=${filters.endDate}`;
      if (filters.status) {
        url += `&status=${filters.status}`;
      }
      
      const response = await api.get(url);
      let salesData = response.data;

      // Calcular estatísticas
      const completed = salesData.filter(s => s.status === 'completed');
      const cancelled = salesData.filter(s => s.status === 'cancelled');
      
      setStats({
        total: completed.reduce((sum, s) => sum + s.total, 0),
        count: completed.length,
        cancelled: cancelled.length
      });

      setSales(salesData);
    } catch (error) {
      toast.error('Erro ao carregar vendas');
    } finally {
      setLoading(false);
    }
  };

  const loadSaleDetails = async (saleId) => {
    try {
      const response = await api.get(`/sales/${saleId}`);
      setSelectedSale(response.data);
    } catch (error) {
      toast.error('Erro ao carregar detalhes');
    }
  };

  const handleCancelSale = (sale) => {
    setSaleToCancel(sale);
    setCancelAuthCode('');
    setCancelReason('');
    setShowCancelModal(true);
  };

  const confirmCancelSale = async () => {
    if (!cancelReason.trim()) {
      toast.error('Informe o motivo do cancelamento');
      return;
    }
    
    if (!adminAuthCode) {
      toast.error('Código de autorização não cadastrado! Configure em Configurações.');
      return;
    }
    
    if (cancelAuthCode !== adminAuthCode) {
      toast.error('Código de autorização incorreto!');
      setCancelAuthCode('');
      return;
    }

    try {
      await api.post(`/sales/${saleToCancel.id}/cancel`, { reason: cancelReason });
      toast.success('Venda cancelada!');
      loadSales();
      setSelectedSale(null);
      setShowCancelModal(false);
      setSaleToCancel(null);
    } catch (error) {
      const message = error.response?.data?.message || 'Erro ao cancelar';
      toast.error(message);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  const formatDateTime = (dateStr) => {
    // Adiciona 'Z' para indicar UTC se não tiver timezone
    const utcDate = dateStr.includes('Z') || dateStr.includes('+') ? dateStr : dateStr + 'Z';
    return new Date(utcDate).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  };

  const formatTime = (dateStr) => {
    const utcDate = dateStr.includes('Z') || dateStr.includes('+') ? dateStr : dateStr + 'Z';
    return new Date(utcDate).toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit',
      timeZone: 'America/Sao_Paulo'
    });
  };

  const getPaymentLabel = (method) => {
    const labels = {
      cash: 'Dinheiro',
      credit: 'Crédito',
      debit: 'Débito',
      pix: 'PIX'
    };
    return labels[method] || method;
  };

  // Filtrar por produto (client-side)
  const filteredSales = filters.productSearch
    ? sales.filter(sale => {
        // Precisamos carregar os itens para filtrar - por enquanto filtra pelo ID
        return true; // TODO: implementar busca por produto
      })
    : sales;

  return (
    <div className="sales-page">
      <header className="page-header">
        <div>
          <h1>Histórico de Vendas</h1>
          <p>Consulte todas as vendas realizadas</p>
        </div>
      </header>

      {/* Cards de resumo */}
      <div className="sales-stats">
        <div className="stat-card">
          <span className="stat-label">Vendas no Período</span>
          <span className="stat-value">{stats.count}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Total Vendido</span>
          <span className="stat-value text-success">{formatCurrency(stats.total)}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Canceladas</span>
          <span className="stat-value text-danger">{stats.cancelled}</span>
        </div>
      </div>

      {/* Filtros */}
      <div className="card mb-4">
        {/* Botões de período rápido */}
        <div className="period-buttons" style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
          <button 
            className={`btn btn-sm ${filters.period === 'today' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => handlePeriodChange('today')}
          >
            Hoje
          </button>
          <button 
            className={`btn btn-sm ${filters.period === 'week' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => handlePeriodChange('week')}
          >
            Esta Semana
          </button>
          <button 
            className={`btn btn-sm ${filters.period === 'month' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => handlePeriodChange('month')}
          >
            Este Mês
          </button>
          <button 
            className={`btn btn-sm ${filters.period === 'year' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => handlePeriodChange('year')}
          >
            Este Ano
          </button>
          <button 
            className={`btn btn-sm ${filters.period === 'custom' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFilters({ ...filters, period: 'custom' })}
          >
            <FiFilter /> Personalizado
          </button>
        </div>
        
        <div className="filters-grid">
          <div className="form-group">
            <label className="form-label">
              <FiCalendar /> Data Inicial
            </label>
            <input
              type="date"
              className="form-input"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value, period: 'custom' })}
            />
          </div>
          <div className="form-group">
            <label className="form-label">
              <FiCalendar /> Data Final
            </label>
            <input
              type="date"
              className="form-input"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value, period: 'custom' })}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Status</label>
            <select
              className="form-input form-select"
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            >
              <option value="">Todas</option>
              <option value="completed">Concluídas</option>
              <option value="cancelled">Canceladas</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabela de vendas */}
      <div className="card">
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Data/Hora</th>
                <th>Operador</th>
                <th>Caixa</th>
                <th>Itens</th>
                <th>Total</th>
                <th>Pagamento</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredSales.map(sale => (
                <tr key={sale.id} className={sale.status === 'cancelled' ? 'row-cancelled' : ''}>
                  <td>
                    <div className="cell-datetime">
                      <strong>{formatTime(sale.created_at)}</strong>
                      <span className="text-muted">
                        {new Date(sale.created_at.includes('Z') ? sale.created_at : sale.created_at + 'Z').toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}
                      </span>
                    </div>
                  </td>
                  <td>{sale.user_name}</td>
                  <td>Caixa {sale.cash_register_id?.substring(0, 4) || '-'}</td>
                  <td>-</td>
                  <td className={sale.status === 'cancelled' ? 'text-danger line-through' : ''}>
                    {formatCurrency(sale.total)}
                  </td>
                  <td>
                    <span className="badge badge-info">
                      {getPaymentLabel(sale.payment_method)}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${sale.status === 'completed' ? 'badge-success' : 'badge-danger'}`}>
                      {sale.status === 'completed' ? 'Concluída' : 'Cancelada'}
                    </span>
                  </td>
                  <td>
                    <button 
                      className="btn btn-sm btn-secondary"
                      onClick={() => loadSaleDetails(sale.id)}
                      title="Ver detalhes"
                    >
                      <FiEye />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredSales.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center text-muted">
                    {loading ? 'Carregando...' : 'Nenhuma venda encontrada no período'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de detalhes */}
      {selectedSale && (
        <div className="modal-overlay" onClick={() => setSelectedSale(null)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Detalhes da Venda</h3>
              <button className="modal-close" onClick={() => setSelectedSale(null)}>×</button>
            </div>
            <div className="modal-body">
              {/* Info da venda */}
              <div className="sale-info-grid">
                <div className="sale-info-item">
                  <span className="label">Data/Hora</span>
                  <span className="value">{formatDateTime(selectedSale.created_at)}</span>
                </div>
                <div className="sale-info-item">
                  <span className="label">Operador</span>
                  <span className="value">{selectedSale.user_name}</span>
                </div>
                <div className="sale-info-item">
                  <span className="label">Pagamento</span>
                  <span className="value">{getPaymentLabel(selectedSale.payment_method)}</span>
                </div>
                <div className="sale-info-item">
                  <span className="label">Status</span>
                  <span className={`badge ${selectedSale.status === 'completed' ? 'badge-success' : 'badge-danger'}`}>
                    {selectedSale.status === 'completed' ? 'Concluída' : 'Cancelada'}
                  </span>
                </div>
              </div>

              {selectedSale.cancelled_reason && (
                <div className="cancelled-reason">
                  <strong>Motivo do cancelamento:</strong> {selectedSale.cancelled_reason}
                </div>
              )}

              {/* Itens */}
              <h4 className="mt-4">Itens da Venda</h4>
              <table className="table">
                <thead>
                  <tr>
                    <th>Produto</th>
                    <th>Qtd</th>
                    <th>Preço Unit.</th>
                    <th>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedSale.items?.map(item => (
                    <tr key={item.id}>
                      <td>{item.product_name}</td>
                      <td>{item.quantity}</td>
                      <td>{formatCurrency(item.unit_price)}</td>
                      <td>{formatCurrency(item.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={3} className="text-right"><strong>Total:</strong></td>
                    <td><strong>{formatCurrency(selectedSale.total)}</strong></td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <div className="modal-footer">
              {selectedSale.status === 'completed' && isManager && (
                <button 
                  className="btn btn-danger"
                  onClick={() => handleCancelSale(selectedSale)}
                >
                  <FiX /> Cancelar Venda
                </button>
              )}
              <button className="btn btn-secondary" onClick={() => setSelectedSale(null)}>
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Cancelamento com Autorização */}
      {showCancelModal && saleToCancel && (
        <div className="modal-overlay" onClick={() => setShowCancelModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <div className="modal-header" style={{ background: '#ef4444', color: 'white' }}>
              <h3 className="modal-title" style={{ color: 'white' }}>
                <FiShield style={{ marginRight: 8 }} />
                Cancelar Venda
              </h3>
              <button className="modal-close" onClick={() => setShowCancelModal(false)} style={{ color: 'white' }}>×</button>
            </div>
            <div className="modal-body">
              <div style={{ 
                background: '#fef2f2', 
                padding: '1rem', 
                borderRadius: '8px', 
                marginBottom: '1rem',
                textAlign: 'center'
              }}>
                <p style={{ margin: 0, fontWeight: 600, color: '#991b1b' }}>
                  Venda de {formatCurrency(saleToCancel.total)}
                </p>
                <p style={{ margin: 0, color: '#dc2626', fontSize: '0.875rem' }}>
                  {formatDateTime(saleToCancel.created_at)}
                </p>
              </div>
              
              <div className="form-group">
                <label className="form-label">Motivo do Cancelamento *</label>
                <textarea
                  className="form-input"
                  rows="2"
                  placeholder="Informe o motivo..."
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  autoFocus
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">Código de Autorização *</label>
                <input
                  type="password"
                  className="form-input"
                  placeholder="Escaneie o cartão de autorização..."
                  value={cancelAuthCode}
                  onChange={(e) => setCancelAuthCode(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && confirmCancelSale()}
                  style={{ textAlign: 'center', fontSize: '1.25rem' }}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowCancelModal(false)}>
                Voltar
              </button>
              <button 
                className="btn btn-danger"
                onClick={confirmCancelSale}
                disabled={!cancelReason.trim() || !cancelAuthCode}
              >
                <FiX /> Confirmar Cancelamento
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Sales;
