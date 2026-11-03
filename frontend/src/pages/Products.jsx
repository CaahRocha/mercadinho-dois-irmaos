import { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { FiPlus, FiEdit2, FiTrash2, FiSearch, FiDollarSign, FiTag } from 'react-icons/fi';

function Products() {
  const { isManager } = useAuth();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({
    barcode: '',
    name: '',
    category: '',
    price: '',
    cost_price: '',
    stock: '',
    min_stock: '5',
    unit: 'UN'
  });

  // Estados para seleção múltipla e modais
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [showBatchPriceModal, setShowBatchPriceModal] = useState(false);
  const [showRenameCategoryModal, setShowRenameCategoryModal] = useState(false);
  const [batchPrice, setBatchPrice] = useState('');
  const [categoryToRename, setCategoryToRename] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');

  useEffect(() => {
    loadProducts();
    loadCategories();
  }, [selectedCategory]);

  const loadProducts = async () => {
    try {
      let url = '/products';
      if (selectedCategory) {
        url += `?category=${selectedCategory}`;
      }
      const response = await api.get(url);
      setProducts(response.data);
      setSelectedProducts([]); // Limpar seleção ao recarregar
    } catch (error) {
      toast.error('Erro ao carregar produtos');
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const response = await api.get('/products/categories');
      setCategories(response.data);
    } catch (error) {
      console.error('Erro ao carregar categorias:', error);
    }
  };

  const handleSearch = async (term) => {
    setSearchTerm(term);
    
    // Remove espaços extras
    const cleanTerm = term.trim();
    
    if (cleanTerm.length < 1) {
      loadProducts();
      return;
    }
    
    try {
      // Se for só números, tenta buscar por código de barras primeiro
      if (/^\d+$/.test(cleanTerm)) {
        try {
          const barcodeResponse = await api.get(`/products/barcode/${cleanTerm}`);
          if (barcodeResponse.data) {
            setProducts([barcodeResponse.data]);
            setSelectedProducts([]);
            return;
          }
        } catch (e) {
          // Não encontrou por barcode, vai buscar por nome abaixo
        }
      }
      
      // Busca por nome (sempre, mesmo se for número)
      if (cleanTerm.length >= 2) {
        const response = await api.get(`/products/search/${encodeURIComponent(cleanTerm)}`);
        setProducts(response.data);
        setSelectedProducts([]);
      } else if (/^\d+$/.test(cleanTerm)) {
        // Se for número com menos de 2 dígitos e não achou por barcode
        setProducts([]);
      } else {
        setProducts([]);
      }
    } catch (error) {
      console.error('Erro na busca:', error);
      setProducts([]);
    }
  };

  const openModal = (product = null) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        barcode: product.barcode || '',
        name: product.name,
        category: product.category || '',
        price: product.price.toString(),
        cost_price: product.cost_price?.toString() || '',
        stock: product.stock.toString(),
        min_stock: product.min_stock?.toString() || '5',
        unit: product.unit || 'UN'
      });
    } else {
      setEditingProduct(null);
      setFormData({
        barcode: '',
        name: '',
        category: '',
        price: '',
        cost_price: '',
        stock: '',
        min_stock: '5',
        unit: 'UN'
      });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const data = {
      ...formData,
      price: parseFloat(formData.price),
      cost_price: formData.cost_price ? parseFloat(formData.cost_price) : 0,
      stock: parseInt(formData.stock) || 0,
      min_stock: parseInt(formData.min_stock) || 5
    };

    try {
      if (editingProduct) {
        await api.put(`/products/${editingProduct.id}`, data);
        toast.success('Produto atualizado!');
      } else {
        await api.post('/products', data);
        toast.success('Produto cadastrado!');
      }
      setShowModal(false);
      loadProducts();
      loadCategories();
    } catch (error) {
      const message = error.response?.data?.message || 'Erro ao salvar produto';
      toast.error(message);
    }
  };

  const handleDelete = async (product) => {
    if (!window.confirm(`Deseja desativar o produto "${product.name}"?`)) {
      return;
    }

    try {
      await api.delete(`/products/${product.id}`);
      toast.success('Produto desativado!');
      loadProducts();
    } catch (error) {
      toast.error('Erro ao desativar produto');
    }
  };

  // Funções para seleção múltipla
  const toggleProductSelection = (productId) => {
    setSelectedProducts(prev => {
      if (prev.includes(productId)) {
        return prev.filter(id => id !== productId);
      } else {
        return [...prev, productId];
      }
    });
  };

  const toggleSelectAll = () => {
    if (selectedProducts.length === products.length) {
      setSelectedProducts([]);
    } else {
      setSelectedProducts(products.map(p => p.id));
    }
  };

  // Atualizar preço em lote
  const handleBatchPriceUpdate = async (e) => {
    e.preventDefault();

    if (selectedProducts.length === 0) {
      toast.error('Selecione pelo menos um produto');
      return;
    }

    const price = parseFloat(batchPrice);
    if (isNaN(price) || price < 0) {
      toast.error('Informe um preço válido');
      return;
    }

    try {
      const response = await api.put('/products/batch/price', {
        productIds: selectedProducts,
        price: price
      });
      toast.success(response.data.message);
      setShowBatchPriceModal(false);
      setBatchPrice('');
      loadProducts();
    } catch (error) {
      const message = error.response?.data?.message || 'Erro ao atualizar preços';
      toast.error(message);
    }
  };

  // Renomear categoria
  const openRenameCategoryModal = (category) => {
    setCategoryToRename(category);
    setNewCategoryName(category);
    setShowRenameCategoryModal(true);
  };

  const handleRenameCategory = async (e) => {
    e.preventDefault();

    if (!newCategoryName.trim()) {
      toast.error('Informe o novo nome da categoria');
      return;
    }

    try {
      const response = await api.put('/products/category/rename', {
        oldName: categoryToRename,
        newName: newCategoryName.trim()
      });
      toast.success(response.data.message);
      setShowRenameCategoryModal(false);
      setCategoryToRename('');
      setNewCategoryName('');
      loadProducts();
      loadCategories();
    } catch (error) {
      const message = error.response?.data?.message || 'Erro ao renomear categoria';
      toast.error(message);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  // Produtos selecionados (para exibir no modal)
  const getSelectedProductsDetails = () => {
    return products.filter(p => selectedProducts.includes(p.id));
  };

  return (
    <div className="products-page">
      <header className="page-header flex justify-between items-center">
        <div>
          <h1>Produtos</h1>
          <p>Gerencie o catálogo de produtos</p>
        </div>
        <div className="flex gap-2">
          {isManager && selectedProducts.length > 0 && (
            <button 
              className="btn btn-secondary" 
              onClick={() => setShowBatchPriceModal(true)}
              title="Alterar preço dos selecionados"
            >
              <FiDollarSign />
              Alterar Preço ({selectedProducts.length})
            </button>
          )}
          {isManager && (
            <button className="btn btn-primary" onClick={() => openModal()}>
              <FiPlus />
              Novo Produto
            </button>
          )}
        </div>
      </header>

      {/* Filtros */}
      <div className="card mb-4">
        <div className="flex gap-4" style={{ flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="form-group" style={{ flex: 1, minWidth: 200, marginBottom: 0 }}>
            <div className="input-icon" style={{ position: 'relative' }}>
              <FiSearch style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
              <input
                type="text"
                className="form-input"
                placeholder="Buscar por nome ou código..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                style={{ paddingLeft: '2.5rem' }}
              />
            </div>
          </div>
          <div className="form-group" style={{ width: 200, marginBottom: 0 }}>
            <select
              className="form-input form-select"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="">Todas categorias</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          {isManager && selectedCategory && (
            <button 
              className="btn btn-secondary"
              onClick={() => openRenameCategoryModal(selectedCategory)}
              title="Renomear esta categoria"
            >
              <FiTag />
              Renomear Categoria
            </button>
          )}
        </div>
      </div>

      {/* Info de seleção */}
      {isManager && products.length > 0 && (
        <div className="card mb-4" style={{ padding: '0.75rem 1rem', background: '#f0f9ff' }}>
          <div className="flex justify-between items-center">
            <span style={{ color: '#0369a1', fontSize: '0.9rem' }}>
              {selectedProducts.length > 0 
                ? `${selectedProducts.length} produto(s) selecionado(s)` 
                : 'Marque os produtos para alterar o preço em lote'}
            </span>
            {products.length > 0 && (
              <button 
                className="btn btn-sm btn-secondary"
                onClick={toggleSelectAll}
              >
                {selectedProducts.length === products.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Tabela */}
      <div className="card">
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                {isManager && (
                  <th style={{ width: 40 }}>
                    <input 
                      type="checkbox"
                      checked={products.length > 0 && selectedProducts.length === products.length}
                      onChange={toggleSelectAll}
                      title="Selecionar todos"
                    />
                  </th>
                )}
                <th>Código</th>
                <th>Nome</th>
                <th>Categoria</th>
                <th>Preço</th>
                <th>Estoque</th>
                {isManager && <th>Ações</th>}
              </tr>
            </thead>
            <tbody>
              {products.map(product => (
                <tr 
                  key={product.id} 
                  className={selectedProducts.includes(product.id) ? 'selected-row' : ''}
                  style={selectedProducts.includes(product.id) ? { backgroundColor: '#eff6ff' } : {}}
                >
                  {isManager && (
                    <td>
                      <input 
                        type="checkbox"
                        checked={selectedProducts.includes(product.id)}
                        onChange={() => toggleProductSelection(product.id)}
                      />
                    </td>
                  )}
                  <td>{product.barcode || '-'}</td>
                  <td>{product.name}</td>
                  <td>{product.category || '-'}</td>
                  <td>{formatCurrency(product.price)}</td>
                  <td>
                    <span className={product.stock <= product.min_stock ? 'text-danger' : ''}>
                      {product.stock} {product.unit}
                    </span>
                  </td>
                  {isManager && (
                    <td>
                      <div className="flex gap-2">
                        <button 
                          className="btn btn-sm btn-secondary"
                          onClick={() => openModal(product)}
                        >
                          <FiEdit2 />
                        </button>
                        <button 
                          className="btn btn-sm btn-danger"
                          onClick={() => handleDelete(product)}
                        >
                          <FiTrash2 />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {products.length === 0 && (
                <tr>
                  <td colSpan={isManager ? 7 : 5} className="text-center text-muted">
                    Nenhum produto encontrado
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Produto */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                {editingProduct ? 'Editar Produto' : 'Novo Produto'}
              </h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Código de Barras</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.barcode}
                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Nome *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Categoria</label>
                  <input
                    type="text"
                    className="form-input"
                    list="categories"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  />
                  <datalist id="categories">
                    {categories.map(cat => (
                      <option key={cat} value={cat} />
                    ))}
                  </datalist>
                </div>
                <div className="flex gap-3">
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Preço de Venda *</label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-input"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Preço de Custo</label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-input"
                      value={formData.cost_price}
                      onChange={(e) => setFormData({ ...formData, cost_price: e.target.value })}
                    />
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Estoque</label>
                    <input
                      type="number"
                      className="form-input"
                      value={formData.stock}
                      onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                    />
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Estoque Mínimo</label>
                    <input
                      type="number"
                      className="form-input"
                      value={formData.min_stock}
                      onChange={(e) => setFormData({ ...formData, min_stock: e.target.value })}
                    />
                  </div>
                  <div className="form-group" style={{ width: 100 }}>
                    <label className="form-label">Unidade</label>
                    <select
                      className="form-input form-select"
                      value={formData.unit}
                      onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    >
                      <option value="UN">UN</option>
                      <option value="KG">KG</option>
                      <option value="L">L</option>
                      <option value="CX">CX</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingProduct ? 'Salvar' : 'Cadastrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Alterar Preço em Lote */}
      {showBatchPriceModal && (
        <div className="modal-overlay" onClick={() => setShowBatchPriceModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <h3 className="modal-title">Alterar Preço em Lote</h3>
              <button className="modal-close" onClick={() => setShowBatchPriceModal(false)}>×</button>
            </div>
            <form onSubmit={handleBatchPriceUpdate}>
              <div className="modal-body">
                <p style={{ marginBottom: '1rem', color: '#6b7280' }}>
                  Você está alterando o preço de <strong>{selectedProducts.length}</strong> produto(s):
                </p>
                
                <div style={{ 
                  maxHeight: 150, 
                  overflowY: 'auto', 
                  marginBottom: '1rem',
                  padding: '0.75rem',
                  background: '#f9fafb',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem'
                }}>
                  {getSelectedProductsDetails().map(p => (
                    <div key={p.id} style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between',
                      padding: '0.25rem 0',
                      borderBottom: '1px solid #e5e7eb'
                    }}>
                      <span>{p.name}</span>
                      <span style={{ color: '#9ca3af' }}>{formatCurrency(p.price)}</span>
                    </div>
                  ))}
                </div>

                <div className="form-group">
                  <label className="form-label">Novo Preço *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="form-input"
                    placeholder="0,00"
                    value={batchPrice}
                    onChange={(e) => setBatchPrice(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowBatchPriceModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  Atualizar Preços
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Renomear Categoria */}
      {showRenameCategoryModal && (
        <div className="modal-overlay" onClick={() => setShowRenameCategoryModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <div className="modal-header">
              <h3 className="modal-title">Renomear Categoria</h3>
              <button className="modal-close" onClick={() => setShowRenameCategoryModal(false)}>×</button>
            </div>
            <form onSubmit={handleRenameCategory}>
              <div className="modal-body">
                <p style={{ marginBottom: '1rem', color: '#6b7280' }}>
                  Todos os produtos da categoria "<strong>{categoryToRename}</strong>" serão atualizados.
                </p>
                
                <div className="form-group">
                  <label className="form-label">Novo Nome da Categoria *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowRenameCategoryModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  Renomear
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Products;
