import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { 
  FiShoppingCart, 
  FiDollarSign, 
  FiPackage,
  FiAlertTriangle,
  FiArrowRight,
  FiList,
  FiX
} from 'react-icons/fi';
import './Dashboard.css';

function Dashboard() {
  const { user, isManager } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    todaySales: { total_sales: 0, total_value: 0 },
    openRegister: null,
    lowStockProducts: []
  });
  const [loading, setLoading] = useState(true);
  const [showSalesModal, setShowSalesModal] = useState(false);
  const [salesList, setSalesList] = useState([]);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const [salesRes, registerRes, productsRes] = await Promise.all([
        api.get('/sales/today'),
        api.get('/cash-registers/my-open'),
        api.get('/products?lowStock=true')
      ]);

      setStats({
        todaySales: salesRes.data,
        openRegister: registerRes.data,
        lowStockProducts: productsRes.data.slice(0, 5)
      });
    } catch (error) {
      console.error('Erro ao carregar dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  const openSalesModal = async () => {
    try {
      // Busca vendas de hoje
      const today = new Date().toISOString().split('T')[0];
      const response = await api.get(`/sales?date=${today}`);
      setSalesList(response.data);
      setShowSalesModal(true);
    } catch (error) {
      console.error('Erro ao carregar vendas:', error);
    }
  };

  const formatTime = (dateStr) => {
    const utcDate = dateStr.includes('Z') || dateStr.includes('+') ? dateStr : dateStr + 'Z';
    return new Date(utcDate).toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit',
      timeZone: 'America/Sao_Paulo'
    });
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <header className="page-header">
        <h1>Olá, {user?.name}!</h1>
        <p>Bem-vindo ao Mercadinho Dois Irmãos</p>
      </header>

      {/* Status do Caixa */}
      <div className={`register-status ${stats.openRegister ? 'open' : 'closed'}`}>
        <div className="register-status-content">
          <FiDollarSign />
          <div>
            <strong>
              {stats.openRegister 
                ? `Caixa ${stats.openRegister.register_number} Aberto` 
                : 'Nenhum caixa aberto'}
            </strong>
            <span>
              {stats.openRegister 
                ? `Turno ${stats.openRegister.shift}` 
                : 'Abra um caixa para iniciar vendas'}
            </span>
          </div>
        </div>
        {!stats.openRegister && (
          <button 
            className="btn btn-primary"
            onClick={() => navigate('/cash-register')}
          >
            Abrir Caixa
            <FiArrowRight />
          </button>
        )}
      </div>

      {/* Cards de resumo */}
      <div className="stats-grid">
        <div 
          className="stat-card" 
          onClick={openSalesModal}
          style={{ cursor: 'pointer', transition: 'transform 0.2s' }}
          onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
          onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
          title="Clique para ver as vendas"
        >
          <div className="stat-icon sales">
            <FiShoppingCart />
          </div>
          <div className="stat-info">
            <span className="stat-label">Vendas Hoje</span>
            <span className="stat-value">{stats.todaySales.total_sales}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon revenue">
            <FiDollarSign />
          </div>
          <div className="stat-info">
            <span className="stat-label">Faturamento Hoje</span>
            <span className="stat-value">{formatCurrency(stats.todaySales.total_value)}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon warning">
            <FiAlertTriangle />
          </div>
          <div className="stat-info">
            <span className="stat-label">Estoque Baixo</span>
            <span className="stat-value">{stats.lowStockProducts.length}</span>
          </div>
        </div>
      </div>

      {/* Ações rápidas */}
      <div className="quick-actions">
        <h2>Ações Rápidas</h2>
        <div className="actions-grid">
          <button 
            className="action-card"
            onClick={() => navigate('/pdv')}
            disabled={!stats.openRegister}
          >
            <FiShoppingCart />
            <span>Nova Venda</span>
          </button>

          <button 
            className="action-card"
            onClick={() => navigate('/products')}
          >
            <FiPackage />
            <span>Produtos</span>
          </button>

          <button 
            className="action-card"
            onClick={() => navigate('/cash-register')}
          >
            <FiDollarSign />
            <span>Caixa</span>
          </button>
        </div>
      </div>

      {/* Produtos com estoque baixo */}
      {stats.lowStockProducts.length > 0 && isManager && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">
              <FiAlertTriangle className="text-warning" />
              Produtos com Estoque Baixo
            </h3>
          </div>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Produto</th>
                  <th>Estoque Atual</th>
                  <th>Estoque Mínimo</th>
                </tr>
              </thead>
              <tbody>
                {stats.lowStockProducts.map(product => (
                  <tr key={product.id}>
                    <td>{product.name}</td>
                    <td className="text-danger">{product.stock} {product.unit}</td>
                    <td>{product.min_stock} {product.unit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
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
                Vendas de Hoje ({salesList.length})
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
                          <td>{formatTime(sale.created_at)}</td>
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
                  Nenhuma venda realizada hoje
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

export default Dashboard;
