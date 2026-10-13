const { dbPromise } = require('./src/database/connection');

dbPromise.then(db => {
  const users = db.prepare('SELECT id, name, username, role FROM users').all();
  console.log('\n=== USUÁRIOS NO BANCO ===');
  users.forEach(u => {
    console.log(`  ${u.username} (${u.role}) - ${u.name}`);
  });
  console.log('\nTotal:', users.length, 'usuários');
  process.exit(0);
}).catch(err => {
  console.error('Erro:', err);
  process.exit(1);
});
