const jwt = require('jsonwebtoken');

/**
 * Middleware de autenticação
 * Verifica se o token JWT é válido
 */
const authenticate = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        error: true,
        message: 'Token de autenticação não fornecido'
      });
    }

    const [, token] = authHeader.split(' ');

    if (!token) {
      return res.status(401).json({
        error: true,
        message: 'Token mal formatado'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    req.user = {
      id: decoded.id,
      username: decoded.username,
      name: decoded.name,
      role: decoded.role
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: true,
        message: 'Token expirado. Faça login novamente.'
      });
    }

    return res.status(401).json({
      error: true,
      message: 'Token inválido'
    });
  }
};

/**
 * Middleware de autorização por role
 * Verifica se o usuário tem a permissão necessária
 */
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: true,
        message: 'Usuário não autenticado'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: true,
        message: 'Você não tem permissão para acessar este recurso'
      });
    }

    next();
  };
};

/**
 * Roles disponíveis:
 * - admin: Acesso total ao sistema
 * - manager: Gerente - pode ver relatórios, cancelar vendas, gerenciar produtos
 * - cashier: Operador de caixa - pode vender e gerenciar seu próprio caixa
 */
const ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  CASHIER: 'cashier'
};

module.exports = {
  authenticate,
  authorize,
  ROLES
};
