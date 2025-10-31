/**
 * Clear Test Data
 * 
 * Remove todos os dados de teste do MongoDB
 */

const { MongoClient } = require('mongodb');

async function clearTestData() {
  const uri = 'mongodb://127.0.0.1:27017/smart-broker?directConnection=true';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db('smart-broker');

    console.log('🗑️  Limpando dados de teste...\n');

    // Listar todas as coleções
    const collections = await db.listCollections().toArray();
    
    for (const collection of collections) {
      const name = collection.name;
      const count = await db.collection(name).countDocuments();
      
      if (count > 0) {
        await db.collection(name).deleteMany({});
        console.log(`✅ ${name}: ${count} documentos removidos`);
      } else {
        console.log(`⏭️  ${name}: vazio`);
      }
    }

    console.log('\n✅ Limpeza concluída!');
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await client.close();
  }
}

clearTestData().catch(console.error);
