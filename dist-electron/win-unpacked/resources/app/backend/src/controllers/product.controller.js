const ProductModel = require('../models/Product.model');

class ProductController {
  /**
   * Listar todos os produtos
   * GET /api/products
   */
  static async getAll(req, res) {
    try {
      const { category, active, lowStock } = req.query;
      
      const products = ProductModel.findAll({
        category,
        active: active === 'false' ? false : (active === 'all' ? null : true),
        lowStock: lowStock === 'true'
      });

      res.json(products);
    } catch (error) {
      console.error('Erro ao listar produtos:', error);
      res.status(500).json({
        error: true,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Buscar produto por ID
   * GET /api/products/:id
   */
  static async getById(req, res) {
    try {
      const product = ProductModel.findById(req.params.id);

      if (!product) {
        return res.status(404).json({
          error: true,
          message: 'Produto não encontrado'
        });
      }

      res.json(product);
    } catch (error) {
      console.error('Erro ao buscar produto:', error);
      res.status(500).json({
        error: true,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Buscar produto por código de barras
   * GET /api/products/barcode/:barcode
   */
  static async getByBarcode(req, res) {
    try {
      const product = ProductModel.findByBarcode(req.params.barcode);

      if (!product) {
        return res.status(404).json({
          error: true,
          message: 'Produto não encontrado'
        });
      }

      res.json(product);
    } catch (error) {
      console.error('Erro ao buscar produto:', error);
      res.status(500).json({
        error: true,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Buscar produtos por nome
   * GET /api/products/search/:name
   */
  static async search(req, res) {
    try {
      const products = ProductModel.searchByName(req.params.name);
      res.json(products);
    } catch (error) {
      console.error('Erro ao buscar produtos:', error);
      res.status(500).json({
        error: true,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Listar categorias
   * GET /api/products/categories
   */
  static async getCategories(req, res) {
    try {
      const categories = ProductModel.getCategories();
      res.json(categories);
    } catch (error) {
      console.error('Erro ao listar categorias:', error);
      res.status(500).json({
        error: true,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Criar novo produto
   * POST /api/products
   */
  static async create(req, res) {
    try {
      const { barcode, name, description, category, price, cost_price, stock, min_stock, unit } = req.body;

      // Verificar se código de barras já existe
      if (barcode) {
        const existing = ProductModel.findByBarcode(barcode);
        if (existing) {
          return res.status(400).json({
            error: true,
            message: 'Código de barras já cadastrado'
          });
        }
      }

      const product = ProductModel.create({
        barcode,
        name,
        description,
        category,
        price,
        cost_price,
        stock,
        min_stock,
        unit
      });

      res.status(201).json(product);
    } catch (error) {
      console.error('Erro ao criar produto:', error);
      res.status(500).json({
        error: true,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Atualizar produto
   * PUT /api/products/:id
   */
  static async update(req, res) {
    try {
      const { barcode } = req.body;

      // Verificar se código de barras já existe para outro produto
      if (barcode) {
        const existing = ProductModel.findByBarcode(barcode);
        if (existing && existing.id !== req.params.id) {
          return res.status(400).json({
            error: true,
            message: 'Código de barras já cadastrado para outro produto'
          });
        }
      }

      const product = ProductModel.update(req.params.id, req.body);

      if (!product) {
        return res.status(404).json({
          error: true,
          message: 'Produto não encontrado'
        });
      }

      res.json(product);
    } catch (error) {
      console.error('Erro ao atualizar produto:', error);
      res.status(500).json({
        error: true,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Atualizar estoque
   * PATCH /api/products/:id/stock
   */
  static async updateStock(req, res) {
    try {
      const { quantity, operation } = req.body;

      const product = ProductModel.updateStock(req.params.id, quantity, operation);

      if (!product) {
        return res.status(404).json({
          error: true,
          message: 'Produto não encontrado'
        });
      }

      res.json(product);
    } catch (error) {
      console.error('Erro ao atualizar estoque:', error);
      res.status(500).json({
        error: true,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Desativar produto
   * DELETE /api/products/:id
   */
  static async delete(req, res) {
    try {
      const result = ProductModel.deactivate(req.params.id);

      if (result.changes === 0) {
        return res.status(404).json({
          error: true,
          message: 'Produto não encontrado'
        });
      }

      res.json({
        message: 'Produto desativado com sucesso'
      });
    } catch (error) {
      console.error('Erro ao desativar produto:', error);
      res.status(500).json({
        error: true,
        message: 'Erro interno do servidor'
      });
    }
  }
}

module.exports = ProductController;
