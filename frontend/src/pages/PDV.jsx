import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { 
  FiSearch, 
  FiShoppingCart, 
  FiPlus, 
  FiMinus, 
  FiTrash2,
  FiCheck,
  FiUser,
  FiX,
  FiDollarSign,
  FiPlusCircle
} from 'react-icons/fi';
import { GiWeight } from 'react-icons/gi';
import './PDV.css';

function PDV() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [loading, setLoading] = useState(false);
  const [hasOpenRegister, setHasOpenRegister] = useState(false);
  const searchRef = useRef(null);
  
  // Estados para Fiado
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  
  // Estados para produto por peso
  const [showWeightModal, setShowWeightModal] = useState(false);
  const [weightProduct, setWeightProduct] = useState(null);
  const [weightInput, setWeightInput] = useState('');
  
  // Estados para PIX QR Code
  const [showPixModal, setShowPixModal] = useState(false);
  const [pixQrCode, setPixQrCode] = useState('');
  const [pixKey, setPixKey] = useState('');
  const [pixName, setPixName] = useState('');
  const [pixCity, setPixCity] = useState('');
  const [pixQrImage, setPixQrImage] = useState('');
  
  // Estados para Troco (Dinheiro)
  const [showCashModal, setShowCashModal] = useState(false);
  const [cashReceived, setCashReceived] = useState('');
  
  // Estados para Venda Avulsa (sem produto cadastrado)
  const [showQuickSaleModal, setShowQuickSaleModal] = useState(false);
  const [quickSaleValue, setQuickSaleValue] = useState('');
  const [quickSaleDescription, setQuickSaleDescription] = useState('');
  const [quickSaleCostPrice, setQuickSaleCostPrice] = useState('');
  const [quickSaleBarcode, setQuickSaleBarcode] = useState('');
  const [wantToRegister, setWantToRegister] = useState(false);
  
  // Estados para Desconto
  const [discount, setDiscount] = useState('');
  const [discountType, setDiscountType] = useState('value'); // 'value' ou 'percent'
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [discountPassword, setDiscountPassword] = useState('');
  const [discountAuthorized, setDiscountAuthorized] = useState(false);
  
  // Estados para Cancelar Item
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelPassword, setCancelPassword] = useState('');
  const [itemToCancel, setItemToCancel] = useState(null);

  useEffect(() => {
    checkOpenRegister();
    loadProducts();
    loadSettings();
    searchRef.current?.focus();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await api.get('/settings');
      if (response.data.pix_key) setPixKey(response.data.pix_key);
      if (response.data.pix_name) setPixName(response.data.pix_name);
      if (response.data.pix_city) setPixCity(response.data.pix_city);
      if (response.data.pix_qr_image) setPixQrImage(response.data.pix_qr_image);
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
    }
  };

  const checkOpenRegister = async () => {
    try {
      const response = await api.get('/cash-registers/my-open');
      if (!response.data) {
        toast.error('Você precisa abrir um caixa primeiro!');
        navigate('/cash-register');
        return;
      }
      setHasOpenRegister(true);
    } catch (error) {
      toast.error('Erro ao verificar caixa');
      navigate('/');
    }
  };

  const loadProducts = async () => {
    try {
      const response = await api.get('/products');
      setProducts(response.data);
    } catch (error) {
      toast.error('Erro ao carregar produtos');
    }
  };

  const handleSearch = async (term) => {
    setSearchTerm(term);
    
    if (term.length >= 2) {
      try {
        // Primeiro tenta buscar por código de barras
        if (/^\d+$/.test(term) && term.length >= 8) {
          const response = await api.get(`/products/barcode/${term}`);
          if (response.data) {
            addToCart(response.data);
            setSearchTerm('');
            return;
          }
        }
        
        // Busca por nome
        const response = await api.get(`/products/search/${term}`);
        setProducts(response.data);
      } catch (error) {
        // Se não encontrou por barcode, continua mostrando lista
      }
    } else if (term === '') {
      loadProducts();
    }
  };

  const addToCart = (product, customWeight = null) => {
    if (product.stock <= 0) {
      toast.error('Produto sem estoque');
      return;
    }

    // Se for produto por peso (KG ou L) e não tem peso informado, abre modal
    if ((product.unit === 'KG' || product.unit === 'L') && customWeight === null) {
      setWeightProduct(product);
      setWeightInput('');
      setShowWeightModal(true);
      return;
    }

    const quantity = customWeight !== null ? customWeight : 1;

    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.product_id === product.id);
      
      if (existingItem) {
        const newQty = existingItem.quantity + quantity;
        if (newQty > product.stock) {
          toast.error('Quantidade máxima atingida');
          return prevCart;
        }
        return prevCart.map(item =>
          item.product_id === product.id
            ? { ...item, quantity: Math.round(newQty * 1000) / 1000 }
            : item
        );
      }

      return [...prevCart, {
        product_id: product.id,
        product_name: product.name,
        unit_price: product.price,
        quantity: quantity,
        maxStock: product.stock,
        unit: product.unit
      }];
    });

    toast.success(`${product.name} adicionado`);
  };

  const confirmWeight = () => {
    const weight = parseFloat(weightInput.replace(',', '.'));
    
    if (isNaN(weight) || weight <= 0) {
      toast.error('Informe um peso válido');
      return;
    }
    
    if (weight > weightProduct.stock) {
      toast.error(`Estoque insuficiente. Disponível: ${weightProduct.stock} ${weightProduct.unit}`);
      return;
    }
    
    addToCart(weightProduct, weight);
    setShowWeightModal(false);
    setWeightProduct(null);
    setWeightInput('');
  };

  const updateQuantity = (productId, delta) => {
    setCart(prevCart => {
      return prevCart.map(item => {
        if (item.product_id === productId) {
          // Para KG/L usa incremento de 0.1, para UN usa 1
          const increment = (item.unit === 'KG' || item.unit === 'L') ? 0.1 : 1;
          const newQty = Math.round((item.quantity + (delta * increment)) * 1000) / 1000;
          if (newQty <= 0) return null;
          if (newQty > item.maxStock) {
            toast.error('Estoque insuficiente');
            return item;
          }
          return { ...item, quantity: newQty };
        }
        return item;
      }).filter(Boolean);
    });
  };

  const formatQuantity = (qty, unit) => {
    if (unit === 'KG' || unit === 'L') {
      return `${qty.toFixed(3)} ${unit}`;
    }
    return qty;
  };

  const removeFromCart = (productId) => {
    const item = cart.find(i => i.product_id === productId);
    setItemToCancel(item);
    setCancelPassword('');
    setShowCancelModal(true);
  };

  const confirmCancelItem = async () => {
    try {
      await api.post('/auth/login', {
        username: 'ederson',
        password: cancelPassword
      });
      setCart(prevCart => prevCart.filter(item => item.product_id !== itemToCancel.product_id));
      toast.success(`${itemToCancel.product_name} removido do carrinho`);
      setShowCancelModal(false);
      setItemToCancel(null);
    } catch (error) {
      toast.error('Senha incorreta!');
    }
  };

  const clearCart = () => {
    setCart([]);
    setSelectedCustomer(null);
    setPaymentMethod('cash');
    setDiscount('');
    setDiscountAuthorized(false);
  };

  // Funções de Desconto
  const handleDiscountClick = () => {
    if (discountAuthorized) {
      // Já autorizado, só abre para editar
      return;
    }
    setDiscountPassword('');
    setShowDiscountModal(true);
  };

  const authorizeDiscount = async () => {
    try {
      await api.post('/auth/login', {
        username: 'ederson',
        password: discountPassword
      });
      setDiscountAuthorized(true);
      setShowDiscountModal(false);
      toast.success('Desconto autorizado!');
    } catch (error) {
      toast.error('Senha incorreta!');
    }
  };

  const clearDiscount = () => {
    setDiscount('');
    setDiscountAuthorized(false);
  };

  const parseDiscountInput = (value) => {
    const numbers = value.replace(/\D/g, '');
    return parseInt(numbers, 10) / 100 || 0;
  };

  const formatDiscountInput = (value) => {
    const numbers = value.replace(/\D/g, '');
    if (!numbers) return '';
    const cents = parseInt(numbers, 10);
    return (cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const calculateDiscountValue = () => {
    if (!discountAuthorized || !discount) return 0;
    const subtotal = cart.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
    const discountNum = parseDiscountInput(discount);
    
    if (discountType === 'percent') {
      return (subtotal * discountNum) / 100;
    }
    return discountNum;
  };

  const calculateSubtotal = () => {
    return cart.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
  };

  // Função para Venda Avulsa
  const handleQuickSale = () => {
    setQuickSaleValue('');
    setQuickSaleDescription('');
    setQuickSaleCostPrice('');
    setQuickSaleBarcode('');
    setWantToRegister(false);
    setShowQuickSaleModal(true);
  };

  const formatQuickSaleInput = (value) => {
    const numbers = value.replace(/\D/g, '');
    if (!numbers) return '';
    const cents = parseInt(numbers, 10);
    return (cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const parseQuickSaleInput = (value) => {
    const numbers = value.replace(/\D/g, '');
    return parseInt(numbers, 10) / 100 || 0;
  };

  const confirmQuickSale = async () => {
    const value = parseQuickSaleInput(quickSaleValue);
    if (value <= 0) {
      toast.error('Informe um valor válido');
      return;
    }

    const description = quickSaleDescription.trim() || 'Venda Avulsa';
    
    // Se quer cadastrar o produto
    if (wantToRegister) {
      // Verificar se é admin
      if (user?.role !== 'admin') {
        toast.error('Apenas administradores podem cadastrar produtos');
        return;
      }
      
      if (!quickSaleDescription.trim()) {
        toast.error('Informe o nome do produto para cadastrar');
        return;
      }
      
      // Verificar se preço de venda é menor que preço de custo
      const costPrice = parseQuickSaleInput(quickSaleCostPrice);
      if (costPrice > 0 && value < costPrice) {
        toast.error(`Preço de venda (${formatCurrency(value)}) não pode ser menor que o preço de custo (${formatCurrency(costPrice)})`);
        return;
      }
      
      // Verificar se código de barras já existe
      if (quickSaleBarcode.trim()) {
        try {
          const checkResponse = await api.get(`/products/barcode/${quickSaleBarcode.trim()}`);
          if (checkResponse.data) {
            toast.error(`Código de barras já cadastrado para: ${checkResponse.data.name}`);
            // Pergunta se quer adicionar ao carrinho
            if (window.confirm(`Deseja adicionar "${checkResponse.data.name}" ao carrinho?`)) {
              addToCart(checkResponse.data);
              setShowQuickSaleModal(false);
            }
            return;
          }
        } catch (error) {
          // Se deu 404, significa que não existe - pode cadastrar
        }
      }
      
      try {
        const costPrice = parseQuickSaleInput(quickSaleCostPrice);
        const productData = {
          name: quickSaleDescription.trim(),
          price: value,
          cost_price: costPrice,
          barcode: quickSaleBarcode.trim() || null,
          stock: 100,
          min_stock: 5,
          unit: 'UN',
          category: 'Geral'
        };
        
        const response = await api.post('/products', productData);
        toast.success(`Produto "${quickSaleDescription}" cadastrado!`);
        
        // Adiciona ao carrinho o produto cadastrado
        setCart(prevCart => [...prevCart, {
          product_id: response.data.id,
          product_name: response.data.name,
          unit_price: response.data.price,
          quantity: 1,
          maxStock: response.data.stock,
          unit: response.data.unit
        }]);
        
        loadProducts(); // Recarrega lista de produtos
      } catch (error) {
        const message = error.response?.data?.message || 'Erro ao cadastrar produto';
        toast.error(message);
        return;
      }
    } else {
      // Só adiciona ao carrinho sem cadastrar
      setCart(prevCart => [...prevCart, {
        product_id: `avulso_${Date.now()}`,
        product_name: description,
        unit_price: value,
        quantity: 1,
        maxStock: 9999,
        unit: 'UN',
        isQuickSale: true
      }]);
      
      toast.success(`${description} adicionado: R$ ${formatQuickSaleInput(quickSaleValue)}`);
    }
    
    setShowQuickSaleModal(false);
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const discountValue = calculateDiscountValue();
    return Math.max(0, subtotal - discountValue);
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  // Funções para Fiado
  const handleSelectFiado = () => {
    setShowCustomerModal(true);
    loadCustomers();
  };

  const loadCustomers = async () => {
    try {
      const response = await api.get('/customers');
      setCustomers(response.data);
    } catch (error) {
      toast.error('Erro ao carregar clientes');
    }
  };

  const searchCustomers = async (term) => {
    setCustomerSearch(term);
    if (term.length >= 2) {
      try {
        const response = await api.get(`/customers/search/${encodeURIComponent(term)}`);
        setCustomers(response.data);
      } catch (error) {
        console.error('Erro na busca:', error);
      }
    } else if (term === '') {
      loadCustomers();
    }
  };

  const selectCustomer = (customer) => {
    const total = calculateTotal();
    const available = (customer.credit_limit || 0) - (customer.balance || 0);
    
    // Se limite = 0, significa sem limite (ilimitado)
    if (customer.credit_limit > 0 && total > available) {
      toast.error(`Limite insuficiente. Disponível: ${formatCurrency(available)}`);
      return;
    }
    
    setSelectedCustomer(customer);
    setPaymentMethod('fiado');
    setShowCustomerModal(false);
    setCustomerSearch('');
    toast.success(`Cliente ${customer.name} selecionado para fiado`);
  };

  const clearCustomer = () => {
    setSelectedCustomer(null);
    setPaymentMethod('cash');
  };

  // Função para gerar payload PIX (formato EMV)
  const generatePixPayload = (key, name, city, amount) => {
    const formatField = (id, value) => {
      const len = value.length.toString().padStart(2, '0');
      return `${id}${len}${value}`;
    };

    // Normalizar texto (remover acentos e caracteres especiais)
    const normalize = (str) => {
      return str
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9 ]/g, '')
        .toUpperCase()
        .trim();
    };

    const normalizedName = normalize(name);
    const normalizedCity = normalize(city);

    // Determinar tipo da chave
    let keyType = '01'; // CPF padrão
    if (key.includes('@')) keyType = '02'; // Email
    else if (key.startsWith('+') || key.length === 11) keyType = '01'; // Telefone/CPF
    else if (key.length === 14) keyType = '01'; // CNPJ
    else if (key.length === 32 || key.length === 36) keyType = '04'; // Chave aleatória

    // Merchant Account Information (ID 26)
    const gui = formatField('00', 'br.gov.bcb.pix');
    const pixKey = formatField('01', key);
    const merchantAccount = formatField('26', gui + pixKey);

    // Payload
    let payload = '';
    payload += formatField('00', '01'); // Payload Format Indicator
    payload += merchantAccount; // Merchant Account
    payload += formatField('52', '0000'); // Merchant Category Code
    payload += formatField('53', '986'); // Transaction Currency (BRL)
    
    if (amount > 0) {
      payload += formatField('54', amount.toFixed(2)); // Transaction Amount
    }
    
    payload += formatField('58', 'BR'); // Country Code
    payload += formatField('59', normalizedName.substring(0, 25)); // Merchant Name
    payload += formatField('60', normalizedCity.substring(0, 15)); // Merchant City
    payload += formatField('62', formatField('05', '***')); // Additional Data

    // CRC16 placeholder
    payload += '6304';
    
    // Calcular CRC16
    const crc = crc16(payload);
    payload = payload.slice(0, -4) + formatField('63', crc);

    return payload;
  };

  // CRC16 CCITT-FALSE
  const crc16 = (str) => {
    let crc = 0xFFFF;
    for (let i = 0; i < str.length; i++) {
      crc ^= str.charCodeAt(i) << 8;
      for (let j = 0; j < 8; j++) {
        if (crc & 0x8000) {
          crc = (crc << 1) ^ 0x1021;
        } else {
          crc <<= 1;
        }
      }
    }
    return (crc & 0xFFFF).toString(16).toUpperCase().padStart(4, '0');
  };

  const handleSelectPix = async () => {
    if (cart.length === 0) {
      toast.error('Adicione produtos ao carrinho');
      return;
    }

    if (!pixQrImage) {
      toast.error('Configure o QR Code PIX em Configurações');
      return;
    }

    setPaymentMethod('pix');
    setSelectedCustomer(null);
    setPixQrCode(pixQrImage);
    setShowPixModal(true);
  };

  const confirmPixPayment = () => {
    setShowPixModal(false);
    finalizeSale();
  };

  // Funções para pagamento em Dinheiro com troco
  const handleSelectCash = () => {
    if (cart.length === 0) {
      toast.error('Adicione produtos ao carrinho');
      return;
    }
    setPaymentMethod('cash');
    setSelectedCustomer(null);
    setCashReceived('');
    setShowCashModal(true);
  };

  const formatCashInput = (value) => {
    // Remove tudo que não é número
    const numbers = value.replace(/\D/g, '');
    if (!numbers) return '';
    // Converte para centavos e formata
    const cents = parseInt(numbers, 10);
    return (cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const parseCashInput = (value) => {
    const numbers = value.replace(/\D/g, '');
    return parseInt(numbers, 10) / 100 || 0;
  };

  const calculateChange = () => {
    const received = parseCashInput(cashReceived);
    const total = calculateTotal();
    return received - total;
  };

  const confirmCashPayment = () => {
    const received = parseCashInput(cashReceived);
    const total = calculateTotal();
    
    if (received < total) {
      toast.error('Valor recebido menor que o total');
      return;
    }
    
    setShowCashModal(false);
    finalizeSale();
  };

  const finalizeSale = async () => {
    if (cart.length === 0) {
      toast.error('Adicione produtos ao carrinho');
      return;
    }

    // Se for fiado, precisa ter cliente selecionado
    if (paymentMethod === 'fiado' && !selectedCustomer) {
      toast.error('Selecione um cliente para venda fiado');
      handleSelectFiado();
      return;
    }

    setLoading(true);

    try {
      const saleData = {
        items: cart.map(item => ({
          product_id: item.product_id,
          product_name: item.product_name,
          quantity: item.quantity,
          unit_price: item.unit_price
        })),
        paymentMethod,
        paymentReceived: paymentMethod === 'fiado' ? 0 : calculateTotal()
      };

      // Adicionar customer_id se for fiado
      if (paymentMethod === 'fiado' && selectedCustomer) {
        saleData.customer_id = selectedCustomer.id;
      }

      await api.post('/sales', saleData);

      toast.success(
        paymentMethod === 'fiado' 
          ? `Venda fiado registrada para ${selectedCustomer.name}!`
          : 'Venda realizada com sucesso!'
      );
      clearCart();
      loadProducts();
      searchRef.current?.focus();
    } catch (error) {
      const message = error.response?.data?.message || 'Erro ao finalizar venda';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = searchTerm.length >= 2 
    ? products 
    : products.slice(0, 20);

  if (!hasOpenRegister) {
    return null;
  }

  return (
    <div className="pdv-container">
      {/* Área de produtos */}
      <div className="pdv-products">
        <div className="search-section">
          <div className="search-input-wrapper">
            <FiSearch />
            <input
              ref={searchRef}
              type="text"
              className="form-input"
              placeholder="Buscar produto ou ler código de barras..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>
          <button className="btn btn-warning quick-sale-btn" onClick={handleQuickSale}>
            <FiDollarSign />
            Venda Avulsa
          </button>
        </div>

        <div className="product-results">
          {searchTerm.length >= 2 && filteredProducts.length > 0 ? (
            <div className="product-grid">
              {filteredProducts.map(product => (
                <div
                  key={product.id}
                  className={`product-card ${product.stock <= 0 ? 'out-of-stock' : ''}`}
                  onClick={() => product.stock > 0 && addToCart(product)}
                >
                  <h4>{product.name}</h4>
                  <div className="price">{formatCurrency(product.price)}</div>
                  <div className="stock">
                    Estoque: {product.stock} {product.unit}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-results">
              {searchTerm.length >= 2 ? (
                <p>Nenhum produto encontrado</p>
              ) : (
                <div style={{ textAlign: 'center', padding: '2rem' }}>
                  <FiSearch style={{ fontSize: '3rem', color: '#9ca3af', marginBottom: '1rem' }} />
                  <p style={{ color: '#6b7280' }}>Digite o nome ou código do produto para buscar</p>
                  <p style={{ color: '#9ca3af', fontSize: '0.875rem' }}>ou use o botão "Venda Avulsa" para digitar o valor direto</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Carrinho */}
      <div className="pdv-cart">
        <div className="cart-header">
          <h2>
            <FiShoppingCart />
            Carrinho
          </h2>
          {cart.length > 0 && (
            <button className="btn btn-sm btn-secondary" onClick={clearCart}>
              <FiTrash2 />
              Limpar
            </button>
          )}
        </div>

        {cart.length > 0 ? (
          <>
            <div className="cart-items">
              {cart.map(item => (
                <div key={item.product_id} className="cart-item">
                  <div className="cart-item-info">
                    <h4>{item.product_name}</h4>
                    <span className="item-price">{formatCurrency(item.unit_price)}</span>
                  </div>
                  <div className="cart-item-qty">
                    <button onClick={() => updateQuantity(item.product_id, -1)}>
                      <FiMinus />
                    </button>
                    <span>{formatQuantity(item.quantity, item.unit)}</span>
                    <button onClick={() => updateQuantity(item.product_id, 1)}>
                      <FiPlus />
                    </button>
                  </div>
                  <div className="cart-item-total">
                    {formatCurrency(item.quantity * item.unit_price)}
                  </div>
                </div>
              ))}
            </div>

            <div className="cart-footer">
              <div className="cart-totals">
                <div className="cart-row">
                  <span>Itens:</span>
                  <span>{cart.length}</span>
                </div>
                <div className="cart-row">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(calculateSubtotal())}</span>
                </div>
                
                {/* Desconto */}
                <div className="cart-row discount-row">
                  <span>Desconto:</span>
                  {discountAuthorized ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <select 
                        value={discountType} 
                        onChange={(e) => setDiscountType(e.target.value)}
                        style={{ padding: '0.25rem', borderRadius: '4px', border: '1px solid #d1d5db' }}
                      >
                        <option value="value">R$</option>
                        <option value="percent">%</option>
                      </select>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={discountType === 'value' ? formatDiscountInput(discount) : discount.replace(/\D/g, '')}
                        onChange={(e) => setDiscount(e.target.value.replace(/\D/g, ''))}
                        placeholder="0,00"
                        style={{ 
                          width: '70px', 
                          padding: '0.25rem', 
                          borderRadius: '4px', 
                          border: '1px solid #d1d5db',
                          textAlign: 'right'
                        }}
                      />
                      <button 
                        onClick={clearDiscount}
                        style={{ 
                          background: '#ef4444', 
                          color: 'white', 
                          border: 'none', 
                          borderRadius: '4px',
                          padding: '0.25rem 0.5rem',
                          cursor: 'pointer'
                        }}
                      >
                        <FiX size={14} />
                      </button>
                    </div>
                  ) : (
                    <button 
                      onClick={handleDiscountClick}
                      style={{ 
                        background: '#3b82f6', 
                        color: 'white', 
                        border: 'none', 
                        borderRadius: '4px',
                        padding: '0.25rem 0.75rem',
                        cursor: 'pointer',
                        fontSize: '0.875rem'
                      }}
                    >
                      + Desconto
                    </button>
                  )}
                </div>
                
                {calculateDiscountValue() > 0 && (
                  <div className="cart-row" style={{ color: '#16a34a' }}>
                    <span>Desconto aplicado:</span>
                    <span>-{formatCurrency(calculateDiscountValue())}</span>
                  </div>
                )}
                
                <div className="cart-row total">
                  <span>Total:</span>
                  <span>{formatCurrency(calculateTotal())}</span>
                </div>
              </div>

              <div className="payment-buttons">
                <button
                  className={`payment-btn ${paymentMethod === 'cash' ? 'selected' : ''}`}
                  onClick={handleSelectCash}
                >
                  Dinheiro
                </button>
                <button
                  className={`payment-btn ${paymentMethod === 'pix' ? 'selected' : ''}`}
                  onClick={handleSelectPix}
                >
                  PIX
                </button>
                <button
                  className={`payment-btn ${paymentMethod === 'debit' ? 'selected' : ''}`}
                  onClick={() => { setPaymentMethod('debit'); setSelectedCustomer(null); }}
                >
                  Débito
                </button>
                <button
                  className={`payment-btn ${paymentMethod === 'credit' ? 'selected' : ''}`}
                  onClick={() => { setPaymentMethod('credit'); setSelectedCustomer(null); }}
                >
                  Crédito
                </button>
                <button
                  className={`payment-btn fiado ${paymentMethod === 'fiado' ? 'selected' : ''}`}
                  onClick={handleSelectFiado}
                >
                  <FiUser />
                  Fiado
                </button>
              </div>

              {/* Cliente selecionado para fiado */}
              {selectedCustomer && paymentMethod === 'fiado' && (
                <div className="selected-customer">
                  <div className="customer-info">
                    <FiUser />
                    <div>
                      <strong>{selectedCustomer.name}</strong>
                      <span className="customer-balance">
                        Limite disponível: {formatCurrency((selectedCustomer.credit_limit || 0) - (selectedCustomer.balance || 0))}
                      </span>
                    </div>
                  </div>
                  <button className="btn btn-sm btn-secondary" onClick={clearCustomer}>
                    <FiX />
                  </button>
                </div>
              )}

              <button
                className="btn btn-success finalize-btn"
                onClick={finalizeSale}
                disabled={loading}
              >
                {loading ? (
                  'Processando...'
                ) : (
                  <>
                    <FiCheck />
                    Finalizar Venda
                  </>
                )}
              </button>
            </div>
          </>
        ) : (
          <div className="cart-empty">
            <FiShoppingCart />
            <p>Carrinho vazio</p>
          </div>
        )}
      </div>

      {/* Modal de seleção de cliente para fiado */}
      {showCustomerModal && (
        <div className="modal-overlay" onClick={() => setShowCustomerModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <h3 className="modal-title">
                <FiUser style={{ marginRight: 8 }} />
                Selecionar Cliente para Fiado
              </h3>
              <button className="modal-close" onClick={() => setShowCustomerModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <div className="input-icon" style={{ position: 'relative' }}>
                  <FiSearch style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Buscar cliente..."
                    value={customerSearch}
                    onChange={(e) => searchCustomers(e.target.value)}
                    style={{ paddingLeft: '2.5rem' }}
                    autoFocus
                  />
                </div>
              </div>
              
              <div className="customer-list" style={{ maxHeight: 300, overflowY: 'auto' }}>
                {customers.length > 0 ? (
                  customers.map(customer => {
                    const available = (customer.credit_limit || 0) - (customer.balance || 0);
                    const total = calculateTotal();
                    const canBuy = customer.credit_limit === 0 || total <= available;
                    
                    return (
                      <div
                        key={customer.id}
                        className={`customer-item ${!canBuy ? 'disabled' : ''}`}
                        onClick={() => canBuy && selectCustomer(customer)}
                        style={{
                          padding: '12px',
                          borderBottom: '1px solid #e5e7eb',
                          cursor: canBuy ? 'pointer' : 'not-allowed',
                          opacity: canBuy ? 1 : 0.5,
                          backgroundColor: canBuy ? 'transparent' : '#f9fafb'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <strong>{customer.name}</strong>
                            {customer.phone && (
                              <span style={{ color: '#6b7280', marginLeft: 8, fontSize: '0.875rem' }}>
                                {customer.phone}
                              </span>
                            )}
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '0.875rem', color: customer.balance > 0 ? '#dc2626' : '#6b7280' }}>
                              Débito: {formatCurrency(customer.balance)}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: available <= 0 ? '#dc2626' : '#059669' }}>
                              {customer.credit_limit === 0 
                                ? 'Sem limite'
                                : `Disponível: ${formatCurrency(available)}`
                              }
                            </div>
                          </div>
                        </div>
                        {!canBuy && (
                          <div style={{ fontSize: '0.75rem', color: '#dc2626', marginTop: 4 }}>
                            Limite insuficiente para esta venda
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div style={{ textAlign: 'center', padding: 24, color: '#6b7280' }}>
                    <p>Nenhum cliente encontrado</p>
                    <p style={{ fontSize: '0.875rem' }}>Cadastre clientes em "Clientes (Fiado)"</p>
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowCustomerModal(false)}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Autorização de Desconto */}
      {showDiscountModal && (
        <div className="modal-overlay" onClick={() => setShowDiscountModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 350 }}>
            <div className="modal-header" style={{ background: '#3b82f6', color: 'white' }}>
              <h3 className="modal-title" style={{ color: 'white' }}>
                🔐 Autorizar Desconto
              </h3>
              <button className="modal-close" onClick={() => setShowDiscountModal(false)} style={{ color: 'white' }}>×</button>
            </div>
            <div className="modal-body">
              <p style={{ color: '#6b7280', marginBottom: '1rem', textAlign: 'center' }}>
                Digite a senha do administrador para liberar o desconto
              </p>
              
              <div className="form-group">
                <label className="form-label">Senha do Admin</label>
                <input
                  type="password"
                  className="form-input"
                  placeholder="Digite a senha..."
                  value={discountPassword}
                  onChange={(e) => setDiscountPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && authorizeDiscount()}
                  autoFocus
                  style={{ textAlign: 'center', fontSize: '1.25rem' }}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowDiscountModal(false)}>
                Cancelar
              </button>
              <button 
                className="btn btn-primary"
                onClick={authorizeDiscount}
                disabled={!discountPassword}
              >
                <FiCheck />
                Autorizar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Cancelar Item do Carrinho */}
      {showCancelModal && itemToCancel && (
        <div className="modal-overlay" onClick={() => setShowCancelModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 380 }}>
            <div className="modal-header" style={{ background: '#ef4444', color: 'white' }}>
              <h3 className="modal-title" style={{ color: 'white' }}>
                🗑️ Cancelar Item
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
                <p style={{ margin: 0, fontWeight: 600, color: '#991b1b' }}>{itemToCancel.product_name}</p>
                <p style={{ margin: 0, color: '#dc2626' }}>
                  {itemToCancel.quantity} {itemToCancel.unit} × {formatCurrency(itemToCancel.unit_price)}
                </p>
              </div>
              
              <p style={{ color: '#6b7280', marginBottom: '1rem', textAlign: 'center' }}>
                Digite a senha do administrador para remover este item
              </p>
              
              <div className="form-group">
                <label className="form-label">Senha do Admin</label>
                <input
                  type="password"
                  className="form-input"
                  placeholder="Digite a senha..."
                  value={cancelPassword}
                  onChange={(e) => setCancelPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && confirmCancelItem()}
                  autoFocus
                  style={{ textAlign: 'center', fontSize: '1.25rem' }}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowCancelModal(false)}>
                Voltar
              </button>
              <button 
                className="btn"
                onClick={confirmCancelItem}
                disabled={!cancelPassword}
                style={{ background: '#ef4444', borderColor: '#ef4444', color: 'white' }}
              >
                <FiTrash2 />
                Remover Item
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de peso para produtos KG/L */}
      {showWeightModal && weightProduct && (
        <div className="modal-overlay" onClick={() => setShowWeightModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <div className="modal-header">
              <h3 className="modal-title">
                <GiWeight style={{ marginRight: 8 }} />
                Informar Peso/Quantidade
              </h3>
              <button className="modal-close" onClick={() => setShowWeightModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="card mb-3" style={{ background: '#f3f4f6', textAlign: 'center' }}>
                <h4 style={{ margin: 0, marginBottom: 4 }}>{weightProduct.name}</h4>
                <p style={{ margin: 0, color: '#4f46e5', fontWeight: 600, fontSize: '1.25rem' }}>
                  {formatCurrency(weightProduct.price)} / {weightProduct.unit}
                </p>
                <p style={{ margin: 0, fontSize: '0.875rem', color: '#6b7280' }}>
                  Estoque: {weightProduct.stock} {weightProduct.unit}
                </p>
              </div>
              
              <div className="form-group">
                <label className="form-label">
                  Quantidade em {weightProduct.unit === 'KG' ? 'Quilos' : 'Litros'} *
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder={`Ex: 0.500 ou 1.250`}
                  value={weightInput}
                  onChange={(e) => setWeightInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && confirmWeight()}
                  autoFocus
                  style={{ fontSize: '1.5rem', textAlign: 'center' }}
                />
                <small className="text-muted">
                  Use ponto ou vírgula para decimais (ex: 0.5 ou 0,5)
                </small>
              </div>
              
              {weightInput && !isNaN(parseFloat(weightInput.replace(',', '.'))) && (
                <div className="card" style={{ background: '#ecfdf5', textAlign: 'center' }}>
                  <p style={{ margin: 0, fontSize: '0.875rem', color: '#059669' }}>Valor estimado:</p>
                  <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: '#047857' }}>
                    {formatCurrency(parseFloat(weightInput.replace(',', '.')) * weightProduct.price)}
                  </p>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowWeightModal(false)}>
                Cancelar
              </button>
              <button className="btn btn-primary" onClick={confirmWeight}>
                <FiCheck />
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de PIX QR Code */}
      {showPixModal && (
        <div className="modal-overlay" onClick={() => setShowPixModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <div className="modal-header" style={{ background: '#00d4aa', color: 'white' }}>
              <h3 className="modal-title" style={{ color: 'white' }}>
                Pagamento via PIX
              </h3>
              <button className="modal-close" onClick={() => setShowPixModal(false)} style={{ color: 'white' }}>×</button>
            </div>
            <div className="modal-body" style={{ textAlign: 'center' }}>
              <div style={{ marginBottom: '1rem' }}>
                <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>Valor a pagar:</p>
                <p style={{ fontSize: '2rem', fontWeight: 700, color: '#00d4aa', margin: 0 }}>
                  {formatCurrency(calculateTotal())}
                </p>
              </div>
              
              {pixQrCode ? (
                <div style={{ 
                  background: 'white', 
                  padding: '1rem', 
                  borderRadius: '12px',
                  border: '2px solid #00d4aa',
                  display: 'inline-block'
                }}>
                  <img src={pixQrCode} alt="QR Code PIX" style={{ maxWidth: '100%' }} />
                </div>
              ) : (
                <div style={{ padding: '2rem', color: '#9ca3af' }}>
                  Gerando QR Code...
                </div>
              )}
              
              <div style={{ marginTop: '1rem', padding: '1rem', background: '#f3f4f6', borderRadius: '8px' }}>
                <p style={{ fontSize: '0.875rem', color: '#374151', margin: 0 }}>
                  1. Abra o app do seu banco<br/>
                  2. Escolha pagar com PIX<br/>
                  3. Escaneie o QR Code acima<br/>
                  4. Confirme o pagamento
                </p>
              </div>
              
              <p style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '1rem' }}>
                Chave PIX: {pixKey}
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowPixModal(false)}>
                Cancelar
              </button>
              <button className="btn btn-success" onClick={confirmPixPayment} style={{ background: '#00d4aa', borderColor: '#00d4aa' }}>
                <FiCheck />
                Confirmar Recebimento
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Venda Avulsa */}
      {showQuickSaleModal && (
        <div className="modal-overlay" onClick={() => setShowQuickSaleModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 450 }}>
            <div className="modal-header" style={{ background: '#f59e0b', color: 'white' }}>
              <h3 className="modal-title" style={{ color: 'white' }}>
                <FiDollarSign style={{ marginRight: 8 }} />
                Venda Avulsa
              </h3>
              <button className="modal-close" onClick={() => setShowQuickSaleModal(false)} style={{ color: 'white' }}>×</button>
            </div>
            <div className="modal-body">
              <p style={{ color: '#6b7280', marginBottom: '1rem', textAlign: 'center' }}>
                Digite o valor da venda sem precisar cadastrar produto
              </p>
              
              <div className="form-group">
                <label className="form-label">Nome do Produto {wantToRegister && '*'}</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ex: Refrigerante, Biscoito..."
                  value={quickSaleDescription}
                  onChange={(e) => setQuickSaleDescription(e.target.value)}
                />
              </div>
              
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600 }}>Preço de Venda (R$) *</label>
                <input
                  type="text"
                  inputMode="numeric"
                  className="form-input"
                  placeholder="0,00"
                  value={formatQuickSaleInput(quickSaleValue)}
                  onChange={(e) => setQuickSaleValue(e.target.value.replace(/\D/g, ''))}
                  onKeyDown={(e) => e.key === 'Enter' && !wantToRegister && confirmQuickSale()}
                  autoFocus
                  style={{ 
                    fontSize: '1.5rem', 
                    textAlign: 'center', 
                    fontWeight: 700,
                    padding: '0.75rem'
                  }}
                />
              </div>

              {/* Opção de cadastrar */}
              <div style={{ 
                padding: '1rem', 
                background: wantToRegister ? '#dbeafe' : '#f3f4f6', 
                borderRadius: '8px',
                marginBottom: '1rem',
                border: wantToRegister ? '2px solid #3b82f6' : '1px solid #e5e7eb'
              }}>
                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={wantToRegister}
                    onChange={(e) => setWantToRegister(e.target.checked)}
                    style={{ marginRight: '0.75rem', width: 18, height: 18 }}
                  />
                  <span style={{ fontWeight: 500 }}>Cadastrar este produto para vendas futuras</span>
                </label>
              </div>

              {/* Campos extras para cadastro */}
              {wantToRegister && (
                <div style={{ 
                  padding: '1rem', 
                  background: '#f0f9ff', 
                  borderRadius: '8px',
                  marginBottom: '1rem'
                }}>
                  <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                    <label className="form-label">Código de Barras (opcional)</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Ex: 7891234567890"
                      value={quickSaleBarcode}
                      onChange={(e) => setQuickSaleBarcode(e.target.value)}
                      onBlur={async (e) => {
                        const barcode = e.target.value.trim();
                        if (barcode) {
                          try {
                            const response = await api.get(`/products/barcode/${barcode}`);
                            if (response.data) {
                              toast.error(`Código já cadastrado: ${response.data.name}`);
                              if (window.confirm(`Adicionar "${response.data.name}" ao carrinho?`)) {
                                addToCart(response.data);
                                setShowQuickSaleModal(false);
                              }
                            }
                          } catch (error) {
                            // Não existe, pode cadastrar
                          }
                        }
                      }}
                    />
                  </div>
                  
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Preço de Custo (opcional)</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      className="form-input"
                      placeholder="0,00"
                      value={formatQuickSaleInput(quickSaleCostPrice)}
                      onChange={(e) => setQuickSaleCostPrice(e.target.value.replace(/\D/g, ''))}
                    />
                    <small style={{ color: '#6b7280' }}>Quanto você pagou no produto</small>
                  </div>
                </div>
              )}

              {quickSaleValue && parseQuickSaleInput(quickSaleValue) > 0 && (
                <div style={{ 
                  textAlign: 'center', 
                  padding: '1rem', 
                  borderRadius: '8px',
                  background: '#fef3c7'
                }}>
                  <p style={{ fontSize: '0.875rem', color: '#92400e', margin: 0 }}>
                    {wantToRegister ? 'Produto será cadastrado e adicionado:' : 'Será adicionado ao carrinho:'}
                  </p>
                  <p style={{ 
                    fontSize: '1.5rem', 
                    fontWeight: 700, 
                    color: '#d97706', 
                    margin: 0 
                  }}>
                    {formatCurrency(parseQuickSaleInput(quickSaleValue))}
                  </p>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowQuickSaleModal(false)}>
                Cancelar
              </button>
              <button 
                className="btn" 
                onClick={confirmQuickSale}
                disabled={!quickSaleValue || parseQuickSaleInput(quickSaleValue) <= 0 || (wantToRegister && !quickSaleDescription.trim())}
                style={{ background: '#f59e0b', borderColor: '#f59e0b', color: 'white' }}
              >
                <FiPlus />
                {wantToRegister ? 'Cadastrar e Adicionar' : 'Adicionar ao Carrinho'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Pagamento em Dinheiro com Troco */}
      {showCashModal && (
        <div className="modal-overlay" onClick={() => setShowCashModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <div className="modal-header" style={{ background: '#16a34a', color: 'white' }}>
              <h3 className="modal-title" style={{ color: 'white' }}>
                Pagamento em Dinheiro
              </h3>
              <button className="modal-close" onClick={() => setShowCashModal(false)} style={{ color: 'white' }}>×</button>
            </div>
            <div className="modal-body">
              {/* Valor Total */}
              <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>Total a Pagar</p>
                <p style={{ fontSize: '2.5rem', fontWeight: 700, color: '#16a34a', margin: 0 }}>
                  {formatCurrency(calculateTotal())}
                </p>
              </div>

              {/* Valor Recebido */}
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600 }}>Valor Recebido (R$)</label>
                <input
                  type="text"
                  inputMode="numeric"
                  className="form-input"
                  placeholder="0,00"
                  value={formatCashInput(cashReceived)}
                  onChange={(e) => setCashReceived(e.target.value.replace(/\D/g, ''))}
                  onKeyDown={(e) => e.key === 'Enter' && confirmCashPayment()}
                  autoFocus
                  style={{ 
                    fontSize: '2rem', 
                    textAlign: 'center', 
                    fontWeight: 700,
                    padding: '1rem'
                  }}
                />
              </div>

              {/* Troco */}
              {cashReceived && (
                <div style={{ 
                  textAlign: 'center', 
                  padding: '1rem', 
                  borderRadius: '8px',
                  background: calculateChange() >= 0 ? '#ecfdf5' : '#fef2f2',
                  marginTop: '1rem'
                }}>
                  <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>
                    {calculateChange() >= 0 ? 'Troco a Devolver' : 'Falta'}
                  </p>
                  <p style={{ 
                    fontSize: '2rem', 
                    fontWeight: 700, 
                    color: calculateChange() >= 0 ? '#16a34a' : '#dc2626', 
                    margin: 0 
                  }}>
                    {formatCurrency(Math.abs(calculateChange()))}
                  </p>
                </div>
              )}

              {/* Atalhos de valor */}
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
                {[5, 10, 20, 50, 100].map(value => (
                  <button
                    key={value}
                    type="button"
                    className="btn btn-secondary"
                    style={{ flex: 1, minWidth: '60px' }}
                    onClick={() => setCashReceived(String(value * 100))}
                  >
                    R$ {value}
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                  onClick={() => setCashReceived(String(Math.ceil(calculateTotal()) * 100))}
                >
                  Valor Exato
                </button>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowCashModal(false)}>
                Cancelar
              </button>
              <button 
                className="btn btn-success" 
                onClick={confirmCashPayment}
                disabled={!cashReceived || calculateChange() < 0}
                style={{ background: '#16a34a', borderColor: '#16a34a' }}
              >
                <FiCheck />
                Confirmar (F3)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PDV;
