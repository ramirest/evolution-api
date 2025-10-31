const { MongoClient } = require('mongodb');

(async () => {
  const client = new MongoClient('mongodb://127.0.0.1:27017');
  
  try {
    await client.connect();
    console.log('Conectado ao MongoDB');
    
    const db = client.db('smart-broker');
    const users = db.collection('users');
    
    const result = await users.updateMany(
      { 
        email: { 
          $in: ['admin@test.com', 'manager@test.com', 'agent@test.com', 'viewer@test.com'] 
        } 
      },
      { 
        $set: { agencyId: '6904fa67b79c8cf0cb07d23d' } 
      }
    );
    
    console.log(`Usuarios atualizados: ${result.modifiedCount}`);
    
    await client.close();
  } catch (error) {
    console.error('Erro:', error.message);
    process.exit(1);
  }
})();
