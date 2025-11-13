const mongoose = require('mongoose');

const uri = 'mongodb://127.0.0.1:27017/smart-broker?directConnection=true';

async function activateProperty() {
  try {
    await mongoose.connect(uri);
    console.log('✅ Conectado ao MongoDB');
    
    const result = await mongoose.connection.db.collection('properties').updateOne(
      { _id: new mongoose.Types.ObjectId('6904fa68b79c8cf0cb07d24e') },
      { $set: { isActive: true } }
    );
    
    console.log(`✅ Atualizado: ${result.modifiedCount} documento(s)`);
    
    const doc = await mongoose.connection.db.collection('properties').findOne(
      { _id: new mongoose.Types.ObjectId('6904fa68b79c8cf0cb07d24e') }
    );
    
    console.log(`✅ isActive agora: ${doc.isActive}`);
    console.log(`✅ status: ${doc.status}`);
    
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

activateProperty();
