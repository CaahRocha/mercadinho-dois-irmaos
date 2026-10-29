import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext({});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('@SistemaMercado:token');
    const storedUser = localStorage.getItem('@SistemaMercado:user');

    if (token && storedUser) {
      api.defaults.headers.Authorization = `Bearer ${token}`;
      setUser(JSON.parse(storedUser));
    }

    setLoading(false);
  }, []);

  const login = async (username, password) => {
    const response = await api.post('/auth/login', { username, password });
    const { user, token } = response.data;

    localStorage.setItem('@SistemaMercado:token', token);
    localStorage.setItem('@SistemaMercado:user', JSON.stringify(user));

    api.defaults.headers.Authorization = `Bearer ${token}`;
    setUser(user);

    return user;
  };

  const logout = () => {
    localStorage.removeItem('@SistemaMercado:token');
    localStorage.removeItem('@SistemaMercado:user');
    api.defaults.headers.Authorization = '';
    setUser(null);
  };

  const isAdmin = user?.role === 'admin';
  const isManager = isAdmin; // Manager agora é o mesmo que Admin
  const isCashier = user?.role === 'cashier';

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      isAuthenticated: !!user,
      isAdmin,
      isManager,
      isCashier,
      login,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider');
  }
  return context;
}
