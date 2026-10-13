import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  FiHome, 
  FiShoppingCart, 
  FiPackage, 
  FiDollarSign, 
  FiUsers,
  FiLogOut,
  FiMenu,
  FiX,
  FiList,
  FiUserCheck,
  FiCreditCard,
  FiSettings
} from 'react-icons/fi';
import { useState } from 'react';
import './Layout.css';

function Layout() {
  const { user, logout, isAdmin, isManager } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const menuItems = [
    { path: '/', icon: FiHome, label: 'Início' },
    { path: '/pdv', icon: FiShoppingCart, label: 'PDV - Vendas' },
    { path: '/products', icon: FiPackage, label: 'Produtos' },
    { path: '/cash-register', icon: FiDollarSign, label: 'Caixa' },
    { path: '/sales', icon: FiList, label: 'Histórico de Vendas' },
    { path: '/customers', icon: FiUserCheck, label: 'Clientes (Fiado)' },
    { path: '/receivables', icon: FiCreditCard, label: 'Contas a Receber' },
  ];

  // Configurações para admin e gerente
  if (isAdmin || isManager) {
    menuItems.push({ path: '/settings', icon: FiSettings, label: 'Configurações' });
  }

  // Usuários só para admin (gerente não pode)
  if (isAdmin) {
    menuItems.push({ path: '/users', icon: FiUsers, label: 'Usuários' });
  }

  return (
    <div className="layout">
      {/* Mobile toggle */}
      <button 
        className="sidebar-toggle"
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        {sidebarOpen ? <FiX /> : <FiMenu />}
      </button>

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <span className="brand-small">Mercadinho</span>
            <span className="brand-main">DOIS IRMÃOS</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          {menuItems.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              <item.icon />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <span className="user-name">{user?.name}</span>
            <span className="user-role">
              {user?.role === 'admin' && 'Ederson'}
              {user?.role === 'manager' && 'Nathanie ❤️'}
              {user?.role === 'cashier' && 'Operador de Caixa'}
            </span>
          </div>
          <button className="logout-btn" onClick={handleLogout}>
            <FiLogOut />
            <span>Sair</span>
          </button>
        </div>
      </aside>

      {/* Overlay mobile */}
      {sidebarOpen && (
        <div 
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}

export default Layout;
