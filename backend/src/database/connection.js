const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');

// Pasta do banco de dados
const dbFolder = path.join(__dirname, '../../../database');
if (!fs.existsSync(dbFolder)) {
  fs.mkdirSync(dbFolder, { recursive: true });
}

const dbPath = path.join(dbFolder, 'mercado.db');

// Variável global para armazenar a instância do banco
let db = null;
let SQL = null;

// Função para salvar o banco no disco
const saveDatabase = () => {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
  }
};

// Auto-save a cada 30 segundos
setInterval(saveDatabase, 30000);

// Salvar ao encerrar o processo
process.on('exit', saveDatabase);
process.on('SIGINT', () => {
  saveDatabase();
  process.exit();
});
process.on('SIGTERM', () => {
  saveDatabase();
  process.exit();
});

// Wrapper para simular a API do better-sqlite3
class DatabaseWrapper {
  constructor(sqlDb) {
    this.db = sqlDb;
  }

  prepare(sql) {
    const self = this;
    return {
      run(...params) {
        try {
          self.db.run(sql, params);
          saveDatabase();
          return { changes: self.db.getRowsModified() };
        } catch (error) {
          console.error('SQL Error:', error.message, '\nSQL:', sql);
          throw error;
        }
      },
      get(...params) {
        try {
          const stmt = self.db.prepare(sql);
          stmt.bind(params);
          if (stmt.step()) {
            const row = stmt.getAsObject();
            stmt.free();
            return row;
          }
          stmt.free();
          return undefined;
        } catch (error) {
          console.error('SQL Error:', error.message, '\nSQL:', sql);
          throw error;
        }
      },
      all(...params) {
        try {
          const results = [];
          const stmt = self.db.prepare(sql);
          stmt.bind(params);
          while (stmt.step()) {
            results.push(stmt.getAsObject());
          }
          stmt.free();
          return results;
        } catch (error) {
          console.error('SQL Error:', error.message, '\nSQL:', sql);
          throw error;
        }
      }
    };
  }

  exec(sql) {
    try {
      this.db.exec(sql);
      saveDatabase();
    } catch (error) {
      console.error('SQL Error:', error.message, '\nSQL:', sql);
      throw error;
    }
  }

  pragma(sql) {
    this.db.exec(`PRAGMA ${sql}`);
  }

  transaction(fn) {
    return () => {
      this.exec('BEGIN TRANSACTION');
      try {
        fn();
        this.exec('COMMIT');
      } catch (error) {
        this.exec('ROLLBACK');
        throw error;
      }
    };
  }
}

// Inicialização assíncrona
const initDatabase = async () => {
  SQL = await initSqlJs();

  // Carregar banco existente ou criar novo
  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  const wrapper = new DatabaseWrapper(db);

  // Habilitar foreign keys
  wrapper.pragma('foreign_keys = ON');

  // Criar tabelas
  wrapper.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('admin', 'manager', 'cashier')),
      active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  wrapper.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      barcode TEXT UNIQUE,
      name TEXT NOT NULL,
      description TEXT,
      category TEXT,
      price REAL NOT NULL,
      cost_price REAL DEFAULT 0,
      stock INTEGER DEFAULT 0,
      min_stock INTEGER DEFAULT 5,
      unit TEXT DEFAULT 'UN',
      active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  wrapper.exec(`
    CREATE TABLE IF NOT EXISTS cash_registers (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      register_number INTEGER NOT NULL,
      shift INTEGER NOT NULL CHECK (shift IN (1, 2)),
      opening_amount REAL NOT NULL,
      closing_amount REAL,
      expected_amount REAL,
      difference REAL,
      status TEXT NOT NULL CHECK (status IN ('open', 'closed')),
      opened_at TEXT DEFAULT CURRENT_TIMESTAMP,
      closed_at TEXT,
      notes TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  wrapper.exec(`
    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT,
      document TEXT,
      credit_limit REAL DEFAULT 0,
      balance REAL DEFAULT 0,
      address TEXT,
      neighborhood TEXT,
      city TEXT,
      whatsapp TEXT,
      notes TEXT,
      active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Adicionar colunas se não existirem (para bancos existentes)
  try { wrapper.exec('ALTER TABLE customers ADD COLUMN address TEXT'); } catch (e) {}
  try { wrapper.exec('ALTER TABLE customers ADD COLUMN neighborhood TEXT'); } catch (e) {}
  try { wrapper.exec('ALTER TABLE customers ADD COLUMN city TEXT'); } catch (e) {}
  try { wrapper.exec('ALTER TABLE customers ADD COLUMN whatsapp TEXT'); } catch (e) {}
  try { wrapper.exec('ALTER TABLE customers ADD COLUMN notes TEXT'); } catch (e) {}

  wrapper.exec(`
    CREATE TABLE IF NOT EXISTS sales (
      id TEXT PRIMARY KEY,
      cash_register_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      customer_id TEXT,
      subtotal REAL NOT NULL,
      discount REAL DEFAULT 0,
      total REAL NOT NULL,
      payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'credit', 'debit', 'pix', 'fiado')),
      payment_received REAL,
      change_amount REAL DEFAULT 0,
      status TEXT DEFAULT 'completed' CHECK (status IN ('completed', 'cancelled')),
      cancelled_reason TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (cash_register_id) REFERENCES cash_registers(id),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (customer_id) REFERENCES customers(id)
    )
  `);

  wrapper.exec(`
    CREATE TABLE IF NOT EXISTS customer_payments (
      id TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      amount REAL NOT NULL,
      payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'credit', 'debit', 'pix')),
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES customers(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  wrapper.exec(`
    CREATE TABLE IF NOT EXISTS sale_items (
      id TEXT PRIMARY KEY,
      sale_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      product_name TEXT NOT NULL,
      quantity REAL NOT NULL,
      unit_price REAL NOT NULL,
      subtotal REAL NOT NULL,
      FOREIGN KEY (sale_id) REFERENCES sales(id),
      FOREIGN KEY (product_id) REFERENCES products(id)
    )
  `);

  wrapper.exec(`
    CREATE TABLE IF NOT EXISTS cash_movements (
      id TEXT PRIMARY KEY,
      cash_register_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('withdrawal', 'deposit')),
      amount REAL NOT NULL,
      reason TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (cash_register_id) REFERENCES cash_registers(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  wrapper.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Criar índices
  wrapper.exec(`CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode)`);
  wrapper.exec(`CREATE INDEX IF NOT EXISTS idx_products_name ON products(name)`);
  wrapper.exec(`CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(created_at)`);
  wrapper.exec(`CREATE INDEX IF NOT EXISTS idx_cash_registers_status ON cash_registers(status)`);
  wrapper.exec(`CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name)`);
  wrapper.exec(`CREATE INDEX IF NOT EXISTS idx_sales_customer ON sales(customer_id)`);

  console.log('Banco de dados inicializado com sucesso!');

  // Criar usuários padrão se não existirem
  const bcrypt = require('bcryptjs');
  const { v4: uuidv4 } = require('uuid');
  
  const defaultUsers = [
    { name: 'Ederson', username: 'ederson', password: 'admin123', role: 'admin' },
    { name: 'Nathanie', username: 'nathanie', password: 'gerente123', role: 'manager' },
    { name: 'Caixa', username: 'caixa', password: 'caixa123', role: 'cashier' }
  ];

  for (const user of defaultUsers) {
    const existing = wrapper.prepare('SELECT id FROM users WHERE username = ?').get(user.username);
    if (!existing) {
      const hashedPassword = bcrypt.hashSync(user.password, 10);
      wrapper.prepare('INSERT INTO users (id, name, username, password, role) VALUES (?, ?, ?, ?, ?)')
        .run(uuidv4(), user.name, user.username, hashedPassword, user.role);
      console.log(`Usuário ${user.username} criado`);
    }
  }

  return wrapper;
};

// Inicializar e exportar
let dbWrapper = null;
const dbPromise = initDatabase().then(wrapper => {
  dbWrapper = wrapper;
  return wrapper;
});

// Exporta uma função que retorna o wrapper (para uso síncrono após inicialização)
module.exports = {
  getDb: () => dbWrapper,
  dbPromise
};
