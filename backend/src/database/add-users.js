/**
 * Script SEGURO para adicionar usuários
 * NÃO apaga dados existentes - apenas adiciona usuários que não existem
 * 
 * Execute: npm run add-users
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const { dbPromise } = require('./connection');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const addUsers = async () => {
  console.log('\n🔒 Script SEGURO - Não apaga dados existentes\n');
  console.log('Aguardando inicialização do banco...\n');
  
  const db = await dbPromise;
  
  // Usuários padrão do sistema - Mercadinho Dois Irmãos
  const defaultUsers = [
    { name: 'Ederson', username: 'ederson', password: 'admin123', role: 'admin' },
    { name: 'Operador de Caixa', username: 'caixa', password: 'caixa123', role: 'cashier' },
  ];

  console.log('Verificando usuários...\n');

  const checkUser = db.prepare('SELECT id FROM users WHERE username = ?');
  const insertUser = db.prepare(`
    INSERT INTO users (id, name, username, password, role)
    VALUES (?, ?, ?, ?, ?)
  `);

  let added = 0;
  let skipped = 0;

  for (const user of defaultUsers) {
    const exists = checkUser.get(user.username);
    
    if (exists) {
      console.log(`  ⏭️  ${user.username} - já existe (não alterado)`);
      skipped++;
    } else {
      const hashedPassword = await bcrypt.hash(user.password, 10);
      insertUser.run(uuidv4(), user.name, user.username, hashedPassword, user.role);
      console.log(`  ✅ ${user.username} - CRIADO (${user.role})`);
      added++;
    }
  }

  console.log('\n' + '═'.repeat(50));
  console.log(`📊 Resultado: ${added} adicionados, ${skipped} já existiam`);
  console.log('═'.repeat(50));
  
  if (added > 0) {
    console.log('\n✅ Novos usuários criados com sucesso!');
    console.log('\nSenhas padrão:');
    console.log('  ederson → admin123 (Admin)');
    console.log('  caixa   → caixa123 (Caixa)');
  } else {
    console.log('\n✅ Todos os usuários já existem. Nenhuma alteração feita.');
  }

  console.log('\n💾 Seus dados (produtos, clientes, vendas, configurações) estão INTACTOS!\n');
  
  process.exit(0);
};

addUsers().catch(err => {
  console.error('Erro:', err);
  process.exit(1);
});
