import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
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
