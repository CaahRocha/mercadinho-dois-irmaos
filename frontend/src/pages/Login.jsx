import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { FiUser, FiLock, FiLogIn, FiShoppingCart, FiEye, FiEyeOff } from 'react-icons/fi';
import './Login.css';

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!username || !password) {
      toast.error('Preencha todos os campos');
      return;
    }

    setLoading(true);

    try {
      await login(username, password);
      toast.success('Login realizado com sucesso!');
      navigate('/');
    } catch (error) {
      const message = error.response?.data?.message || 'Erro ao fazer login';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <div className="login-header">
          <div className="login-logo-container">
            <FiShoppingCart className="login-icon" />
          </div>
          <div className="login-brand">
            <span className="login-brand-small">Mercadinho</span>
            <span className="login-brand-main">DOIS IRMÃOS</span>
            <span className="login-brand-slogan">SEMPRE PENSANDO EM VOCÊ!</span>
          </div>
          <p className="login-subtitle">Faça login para continuar</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label className="form-label">Usuário</label>
            <div className="input-icon">
              <FiUser />
              <input
                type="text"
                className="form-input"
                placeholder="Digite seu usuário"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoFocus
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Senha</label>
            <div className="input-icon">
              <FiLock />
              <input
                type={showPassword ? "text" : "password"}
                className="form-input"
                placeholder="Digite sua senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button 
                type="button" 
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <FiEyeOff /> : <FiEye />}
              </button>
            </div>
          </div>

          <button 
            type="submit" 
            className="btn btn-primary btn-lg w-full"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner" style={{ width: 20, height: 20 }}></span>
                Entrando...
              </>
            ) : (
              <>
                <FiLogIn />
                Entrar
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Login;
