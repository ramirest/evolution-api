/**
 * Check User Agency
 * 
 * Verifica se o usuário Admin tem agencyId definido
 */

const { MongoClient } = require('mongodb');

async function checkUserAgency() {
  const uri = 'mongodb://127.0.0.1:27017/smart-broker?directConnection=true';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db('smart-broker');

    console.log('🔍 Buscando usuários Admin...\n');

    const users = await db.collection('users').find({ role: 'admin' }).toArray();

    if (users.length === 0) {
      console.log('❌ Nenhum usuário Admin encontrado');
      return;
    }

    for (const user of users) {
      console.log('📋 Usuário Admin:');
      console.log('  ID:', user._id.toString());
      console.log('  Email:', user.email);
      console.log('  Role:', user.role);
      console.log('  AgencyId:', user.agencyId ? user.agencyId.toString() : '❌ NÃO DEFINIDO');
      console.log('');
    }

    // Buscar agências
    console.log('🏢 Buscando agências...\n');
    const agencies = await db.collection('agencies').find({}).toArray();

    for (const agency of agencies) {
      console.log('📋 Agência:');
      console.log('  ID:', agency._id.toString());
      console.log('  Nome:', agency.name);
      console.log('  Owner:', agency.owner.toString());
      console.log('');
    }

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await client.close();
  }
}

checkUserAgency().catch(console.error);
