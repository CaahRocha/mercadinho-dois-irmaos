import { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { FiPlus, FiEdit2, FiTrash2, FiSearch } from 'react-icons/fi';

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
    
    if (term.length < 2) {
      loadProducts();
      return;
    }
    
    try {
      const response = await api.get(`/products/search/${encodeURIComponent(term)}`);
      setProducts(response.data);
    } catch (error) {
      console.error('Erro na busca:', error);
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

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return (
    <div className="products-page">
      <header className="page-header flex justify-between items-center">
        <div>
          <h1>Produtos</h1>
          <p>Gerencie o catálogo de produtos</p>
        </div>
        {isManager && (
          <button className="btn btn-primary" onClick={() => openModal()}>
            <FiPlus />
            Novo Produto
          </button>
        )}
      </header>

      {/* Filtros */}
      <div className="card mb-4">
        <div className="flex gap-4" style={{ flexWrap: 'wrap' }}>
          <div className="form-group" style={{ flex: 1, minWidth: 200 }}>
            <div className="input-icon" style={{ position: 'relative' }}>
              <FiSearch style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
              <input
                type="text"
                className="form-input"
                placeholder="Buscar produto..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                style={{ paddingLeft: '2.5rem' }}
              />
            </div>
          </div>
          <div className="form-group" style={{ width: 200 }}>
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
        </div>
      </div>

      {/* Tabela */}
      <div className="card">
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
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
                <tr key={product.id}>
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
                  <td colSpan={isManager ? 6 : 5} className="text-center text-muted">
                    Nenhum produto encontrado
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
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
    </div>
  );
}

export default Products;
