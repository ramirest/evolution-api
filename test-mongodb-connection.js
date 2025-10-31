/**
 * Test MongoDB Connection
 * 
 * Testa diferentes configurações de conexão com MongoDB
 */

const { MongoClient } = require('mongodb');

async function testConnection(uri, description) {
  console.log(`\n🔄 Testando: ${description}`);
  console.log(`URI: ${uri}`);
  
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    await client.db().admin().ping();
    console.log('✅ Conexão bem-sucedida!');
    
    // Listar databases
    const dbs = await client.db().admin().listDatabases();
    console.log('📊 Databases disponíveis:', dbs.databases.map(db => db.name).join(', '));
    
    return true;
  } catch (error) {
    console.error('❌ Erro:', error.message);
    return false;
  } finally {
    await client.close();
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('🧪 TESTE DE CONEXÃO MONGODB');
  console.log('='.repeat(60));

  const configurations = [
    {
      uri: 'mongodb://127.0.0.1:27017/?directConnection=true',
      description: 'Localhost (127.0.0.1) sem autenticação',
    },
    {
      uri: 'mongodb://localhost:27017/?directConnection=true',
      description: 'Localhost (nome) sem autenticação',
    },
    {
      uri: 'mongodb://127.0.0.1:27017/smart-broker?directConnection=true',
      description: 'Com database smart-broker',
    },
  ];

  for (const config of configurations) {
    const success = await testConnection(config.uri, config.description);
    if (success) {
      console.log('\n✅ URI RECOMENDADA:', config.uri);
      break;
    }
  }

  console.log('\n' + '='.repeat(60));
}

main().catch(console.error);
