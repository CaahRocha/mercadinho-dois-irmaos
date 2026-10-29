/**
 * Script para popular o banco com dados iniciais
 * Execute: npm run seed
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const { dbPromise } = require('./connection');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const seed = async () => {
  console.log('Aguardando inicialização do banco...\n');
  
  const db = await dbPromise;
  
  console.log('Iniciando seed do banco de dados...\n');

  // Limpar dados existentes (em ordem por causa das foreign keys)
  db.exec('DELETE FROM sale_items');
  db.exec('DELETE FROM sales');
  db.exec('DELETE FROM cash_movements');
  db.exec('DELETE FROM cash_registers');
  db.exec('DELETE FROM products');
  db.exec('DELETE FROM users');

  // =====================
  // USUÁRIOS
  // =====================
  console.log('Criando usuários...');
  
  const users = [
    { name: 'Administrador', username: 'admin', password: 'admin123', role: 'admin' },
    { name: 'Gerente', username: 'gerente', password: 'gerente123', role: 'manager' },
    { name: 'Caixa 1', username: 'caixa1', password: 'caixa123', role: 'cashier' },
    { name: 'Caixa 2', username: 'caixa2', password: 'caixa123', role: 'cashier' },
  ];

  const insertUser = db.prepare(`
    INSERT INTO users (id, name, username, password, role)
    VALUES (?, ?, ?, ?, ?)
  `);

  for (const user of users) {
    const hashedPassword = await bcrypt.hash(user.password, 10);
    insertUser.run(uuidv4(), user.name, user.username, hashedPassword, user.role);
    console.log(`  - Usuário criado: ${user.username} (${user.role})`);
  }

  // =====================
  // PRODUTOS
  // =====================
  console.log('\nCriando produtos...');

  const products = [
    // Bebidas
    { barcode: '7891000100103', name: 'Coca-Cola 2L', category: 'Bebidas', price: 10.99, cost_price: 7.50, stock: 50 },
    { barcode: '7891000100110', name: 'Coca-Cola Lata 350ml', category: 'Bebidas', price: 5.49, cost_price: 3.50, stock: 100 },
    { barcode: '7891000100127', name: 'Guaraná Antarctica 2L', category: 'Bebidas', price: 8.99, cost_price: 6.00, stock: 40 },
    { barcode: '7891000100134', name: 'Água Mineral 500ml', category: 'Bebidas', price: 2.50, cost_price: 1.00, stock: 200 },
    { barcode: '7891000100141', name: 'Suco Del Valle 1L', category: 'Bebidas', price: 7.99, cost_price: 5.00, stock: 30 },
    
    // Laticínios
    { barcode: '7891000200109', name: 'Leite Integral 1L', category: 'Laticínios', price: 5.99, cost_price: 4.00, stock: 80 },
    { barcode: '7891000200116', name: 'Queijo Mussarela kg', category: 'Laticínios', price: 45.90, cost_price: 35.00, stock: 15, unit: 'KG' },
    { barcode: '7891000200123', name: 'Iogurte Natural 170g', category: 'Laticínios', price: 3.99, cost_price: 2.50, stock: 40 },
    { barcode: '7891000200130', name: 'Manteiga 200g', category: 'Laticínios', price: 12.90, cost_price: 9.00, stock: 25 },
    
    // Padaria
    { barcode: '7891000300106', name: 'Pão Francês kg', category: 'Padaria', price: 14.90, cost_price: 8.00, stock: 20, unit: 'KG' },
    { barcode: '7891000300113', name: 'Pão de Forma', category: 'Padaria', price: 8.50, cost_price: 5.50, stock: 30 },
    { barcode: '7891000300120', name: 'Bolo de Chocolate', category: 'Padaria', price: 25.00, cost_price: 15.00, stock: 10 },
    
    // Mercearia
    { barcode: '7891000400103', name: 'Arroz 5kg', category: 'Mercearia', price: 25.90, cost_price: 18.00, stock: 50 },
    { barcode: '7891000400110', name: 'Feijão 1kg', category: 'Mercearia', price: 8.99, cost_price: 6.00, stock: 60 },
    { barcode: '7891000400127', name: 'Açúcar 1kg', category: 'Mercearia', price: 5.50, cost_price: 3.50, stock: 70 },
    { barcode: '7891000400134', name: 'Café 500g', category: 'Mercearia', price: 18.90, cost_price: 12.00, stock: 40 },
    { barcode: '7891000400141', name: 'Óleo de Soja 900ml', category: 'Mercearia', price: 7.99, cost_price: 5.50, stock: 45 },
    { barcode: '7891000400158', name: 'Macarrão 500g', category: 'Mercearia', price: 4.50, cost_price: 2.80, stock: 80 },
    { barcode: '7891000400165', name: 'Molho de Tomate 340g', category: 'Mercearia', price: 3.99, cost_price: 2.50, stock: 60 },
    
    // Higiene
    { barcode: '7891000500100', name: 'Papel Higiênico 12un', category: 'Higiene', price: 22.90, cost_price: 15.00, stock: 35 },
    { barcode: '7891000500117', name: 'Sabonete 90g', category: 'Higiene', price: 2.50, cost_price: 1.50, stock: 100 },
    { barcode: '7891000500124', name: 'Shampoo 350ml', category: 'Higiene', price: 15.90, cost_price: 10.00, stock: 30 },
    { barcode: '7891000500131', name: 'Creme Dental 90g', category: 'Higiene', price: 5.90, cost_price: 3.50, stock: 50 },
    
    // Limpeza
    { barcode: '7891000600107', name: 'Detergente 500ml', category: 'Limpeza', price: 2.99, cost_price: 1.80, stock: 80 },
    { barcode: '7891000600114', name: 'Água Sanitária 2L', category: 'Limpeza', price: 6.50, cost_price: 4.00, stock: 40 },
    { barcode: '7891000600121', name: 'Desinfetante 2L', category: 'Limpeza', price: 9.90, cost_price: 6.50, stock: 35 },
  ];

  const insertProduct = db.prepare(`
    INSERT INTO products (id, barcode, name, category, price, cost_price, stock, unit)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const product of products) {
    insertProduct.run(
      uuidv4(),
      product.barcode,
      product.name,
      product.category,
      product.price,
      product.cost_price,
      product.stock,
      product.unit || 'UN'
    );
    console.log(`  - Produto criado: ${product.name}`);
  }

  console.log('\n✅ Seed concluído com sucesso!');
  console.log('\nUsuários disponíveis para login:');
  console.log('  admin    / admin123    (Administrador)');
  console.log('  gerente  / gerente123  (Gerente)');
  console.log('  caixa1   / caixa123    (Operador de Caixa)');
  console.log('  caixa2   / caixa123    (Operador de Caixa)');
  
  process.exit(0);
};

seed().catch(err => {
  console.error('Erro no seed:', err);
  process.exit(1);
});
