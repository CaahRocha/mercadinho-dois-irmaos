import axios from 'axios';

// Detecta se está rodando no Electron (file://) ou navegador normal
const isElectron = window.location.protocol === 'file:';
const baseURL = isElectron ? 'http://localhost:3001/api' : '/api';

const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor para tratar erros
api.interceptors.response.use(
  response => response,
  error => {
    // Se token expirou, fazer logout
    if (error.response?.status === 401) {
      const isLoginRoute = error.config.url === '/auth/login';
      
      if (!isLoginRoute) {
        localStorage.removeItem('@SistemaMercado:token');
        localStorage.removeItem('@SistemaMercado:user');
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

export default api;
