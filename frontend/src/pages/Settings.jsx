import { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { FiSettings, FiSave, FiMail, FiSmartphone, FiUpload, FiTrash2 } from 'react-icons/fi';

function Settings() {
  const { isManager } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);
  
  // Configurações PIX
  const [pixKey, setPixKey] = useState('');
  const [pixName, setPixName] = useState('');
  const [pixCity, setPixCity] = useState('');
  const [pixQrImage, setPixQrImage] = useState('');
  const fileInputRef = useRef(null);
  
  // Configurações Email
  const [emailHost, setEmailHost] = useState('');
  const [emailPort, setEmailPort] = useState('587');
  const [emailUser, setEmailUser] = useState('');
  const [emailPassword, setEmailPassword] = useState('');
  const [emailFrom, setEmailFrom] = useState('');
  const [emailTo, setEmailTo] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await api.get('/settings');
      const settings = response.data;
      
      if (settings.pix_key) setPixKey(settings.pix_key);
      if (settings.pix_name) setPixName(settings.pix_name);
      if (settings.pix_city) setPixCity(settings.pix_city);
      if (settings.pix_qr_image) setPixQrImage(settings.pix_qr_image);
      if (settings.email_host) setEmailHost(settings.email_host);
      if (settings.email_port) setEmailPort(settings.email_port);
      if (settings.email_user) setEmailUser(settings.email_user);
      if (settings.email_from) setEmailFrom(settings.email_from);
      if (settings.email_to) setEmailTo(settings.email_to);
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const settings = {
        pix_key: pixKey,
        pix_name: pixName,
        pix_city: pixCity,
        pix_qr_image: pixQrImage,
        email_host: emailHost,
        email_port: emailPort,
        email_user: emailUser,
        email_from: emailFrom,
        email_to: emailTo
      };

      // Só envia senha se foi preenchida
      if (emailPassword) {
        settings.email_password = emailPassword;
      }

      await api.put('/settings', settings);
      toast.success('Configurações salvas com sucesso!');
      setEmailPassword(''); // Limpa o campo de senha
    } catch (error) {
      toast.error('Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  if (!isManager) {
    return (
      <div className="card text-center">
        <FiSettings size={48} style={{ color: '#9ca3af', marginBottom: '1rem' }} />
        <h2>Acesso Restrito</h2>
        <p className="text-muted">Apenas administradores e gerentes podem acessar as configurações.</p>
      </div>
    );
  }

  if (loading) {
    return <div className="text-center p-4">Carregando...</div>;
  }

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Selecione uma imagem válida');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Imagem muito grande. Máximo 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setPixQrImage(event.target.result);
      toast.success('Imagem carregada!');
    };
    reader.readAsDataURL(file);
  };

  const removeQrImage = () => {
    setPixQrImage('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleTestEmail = async () => {
    setTestingEmail(true);
    try {
      const response = await api.post('/settings/test-email');
      if (response.data.success) {
        toast.success('Email de teste enviado! Verifique sua caixa de entrada.');
      } else {
        toast.error(`Falha ao enviar: ${response.data.error || 'Verifique as configurações'}`);
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Erro ao enviar email de teste';
      toast.error(message);
    } finally {
      setTestingEmail(false);
    }
  };

  return (
    <div className="settings-page">
      <header className="page-header">
        <h1>Configurações</h1>
        <p>Configure o sistema de acordo com suas necessidades</p>
      </header>

      <form onSubmit={handleSave}>
        {/* Configurações PIX */}
        <div className="card mb-4">
          <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <FiSmartphone size={24} style={{ color: '#00d4aa' }} />
            <h3 style={{ margin: 0 }}>Configurações do PIX</h3>
          </div>
          
          <div className="form-group">
            <label className="form-label">Imagem do QR Code PIX</label>
            <p className="text-muted" style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>
              Faça upload de um QR Code PIX do seu banco. Ele será exibido quando o cliente escolher pagar com PIX.
            </p>
            
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
              <div style={{ 
                width: '200px', 
                height: '200px', 
                border: '2px dashed #d1d5db', 
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#f9fafb',
                overflow: 'hidden'
              }}>
                {pixQrImage ? (
                  <img 
                    src={pixQrImage} 
                    alt="QR Code PIX" 
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  />
                ) : (
                  <span style={{ color: '#9ca3af', textAlign: 'center', padding: '1rem' }}>
                    Nenhum QR Code<br/>carregado
                  </span>
                )}
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleImageUpload}
                  style={{ display: 'none' }}
                />
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <FiUpload /> Carregar QR Code
                </button>
                {pixQrImage && (
                  <button 
                    type="button" 
                    className="btn btn-danger"
                    onClick={removeQrImage}
                  >
                    <FiTrash2 /> Remover
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="form-group" style={{ marginTop: '1rem' }}>
            <label className="form-label">Chave PIX (opcional)</label>
            <input
              type="text"
              className="form-input"
              value={pixKey}
              onChange={(e) => setPixKey(e.target.value)}
              placeholder="CPF, CNPJ, Email, Telefone ou Chave Aleatória"
            />
            <small className="text-muted">
              Usada apenas para referência - o cliente vai escanear a imagem do QR Code
            </small>
          </div>
          
          <div className="flex gap-3">
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Nome do Recebedor</label>
              <input
                type="text"
                className="form-input"
                value={pixName}
                onChange={(e) => setPixName(e.target.value)}
                placeholder="Nome que aparecerá na tela"
                maxLength={25}
              />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Cidade</label>
              <input
                type="text"
                className="form-input"
                value={pixCity}
                onChange={(e) => setPixCity(e.target.value)}
                placeholder="Cidade"
                maxLength={15}
              />
            </div>
          </div>
        </div>

        {/* Configurações Email */}
        <div className="card mb-4">
          <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <FiMail size={24} style={{ color: '#4f46e5' }} />
            <h3 style={{ margin: 0 }}>Configurações de Email</h3>
          </div>
          <p className="text-muted mb-3" style={{ fontSize: '0.875rem' }}>
            Configure um servidor SMTP para enviar relatórios por email no fechamento do caixa.
          </p>
          
          <div className="flex gap-3">
            <div className="form-group" style={{ flex: 2 }}>
              <label className="form-label">Servidor SMTP</label>
              <input
                type="text"
                className="form-input"
                value={emailHost}
                onChange={(e) => setEmailHost(e.target.value)}
                placeholder="Ex: smtp.gmail.com"
              />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Porta</label>
              <input
                type="text"
                className="form-input"
                value={emailPort}
                onChange={(e) => setEmailPort(e.target.value)}
                placeholder="587"
              />
            </div>
          </div>
          
          <div className="flex gap-3">
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Usuário/Email</label>
              <input
                type="text"
                className="form-input"
                value={emailUser}
                onChange={(e) => setEmailUser(e.target.value)}
                placeholder="seu.email@gmail.com"
              />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Senha/App Password</label>
              <input
                type="password"
                className="form-input"
                value={emailPassword}
                onChange={(e) => setEmailPassword(e.target.value)}
                placeholder="Deixe vazio para manter"
              />
            </div>
          </div>

          <div className="flex gap-3">
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Email Remetente</label>
              <input
                type="email"
                className="form-input"
                value={emailFrom}
                onChange={(e) => setEmailFrom(e.target.value)}
                placeholder="sistema@mercado.com"
              />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Email para Relatórios</label>
              <input
                type="email"
                className="form-input"
                value={emailTo}
                onChange={(e) => setEmailTo(e.target.value)}
                placeholder="gerente@mercado.com"
              />
              <small className="text-muted">
                Relatório do fechamento será enviado para este email
              </small>
            </div>
          </div>

          <div className="card" style={{ background: '#fef3c7', marginTop: '1rem' }}>
            <p style={{ margin: 0, fontSize: '0.875rem', color: '#92400e' }}>
              <strong>Dica para Gmail:</strong> Use uma "Senha de App" em vez da senha normal. 
              Vá em Conta Google → Segurança → Senhas de app.
            </p>
          </div>

          <div style={{ marginTop: '1rem' }}>
            <button 
              type="button" 
              className="btn btn-secondary"
              onClick={handleTestEmail}
              disabled={testingEmail}
            >
              <FiMail />
              {testingEmail ? 'Enviando...' : 'Enviar Email de Teste'}
            </button>
          </div>
        </div>

        <div className="flex justify-end">
          <button type="submit" className="btn btn-primary" disabled={saving}>
            <FiSave />
            {saving ? 'Salvando...' : 'Salvar Configurações'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default Settings;
