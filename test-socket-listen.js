/**
 * Script Simples de Teste - Socket.IO Client Listener
 * 
 * Este script conecta ao backend e ESCUTA as mensagens que chegam.
 * Use este script para verificar se o Socket.IO está funcionando.
 * 
 * Como usar:
 * 1. Certifique-se que o backend está rodando
 * 2. node test-socket-listen.js "HmaRzdaNPCcv5RBq2+vtjjJrBUnqmoW0zj5D0x+LfJw="
 * 3. Envie uma mensagem WhatsApp real para a instância configurada
 * 4. Observe o log aqui!
 */

const { io } = require('socket.io-client');

const BACKEND_URL = process.argv[3] || process.env.BACKEND_URL || 'http://localhost:8080';
const API_KEY = process.argv[2] || process.env.API_KEY || 'HmaRzdaNPCcv5RBq2+vtjjJrBUnqmoW0zj5D0x+LfJw=';

console.log('\n╔════════════════════════════════════════════════════════════╗');
console.log('║  SOCKET.IO LISTENER - SMART BROKER                        ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');
console.log(`🔌 Conectando em: ${BACKEND_URL}`);
console.log(`🔑 API Key: ${API_KEY.substring(0, 20)}...\n`);

const socket = io(BACKEND_URL, {
  query: { apikey: API_KEY },
  transports: ['websocket'],
  reconnection: true,
  reconnectionDelay: 1000,
});

socket.on('connect', () => {
  console.log('✅ CONECTADO AO BACKEND!');
  console.log(`   Socket ID: ${socket.id}`);
  console.log(`   Transport: ${socket.io.engine.transport.name}\n`);
  console.log('👂 Aguardando mensagens...');
  console.log('─'.repeat(60) + '\n');
});

socket.on('connect_error', (error) => {
  console.error('❌ Erro de conexão:', error.message);
  console.log('\n💡 Verifique:');
  console.log('   - Backend rodando em http://localhost:8080');
  console.log('   - API_KEY correta (evolution-api/.env → AUTHENTICATION_API_KEY)');
  console.log('   - WEBSOCKET_ENABLED=true no .env\n');
});

socket.on('disconnect', (reason) => {
  console.log(`\n🔌 Desconectado: ${reason}`);
});

// Escutar TODOS os eventos possíveis
const events = [
  'messages.upsert',
  'messages.update',
  'messages.delete',
  'connection.update',
  'presence.update',
  'chats.upsert',
  'chats.update',
  'chats.delete',
  'contacts.upsert',
  'contacts.update',
  'groups.upsert',
  'groups.update',
];

events.forEach(event => {
  socket.on(event, (payload) => {
    console.log(`\n📨 EVENTO RECEBIDO: ${event}`);
    console.log('─'.repeat(60));
    console.log(JSON.stringify(payload, null, 2));
    console.log('─'.repeat(60) + '\n');
    
    if (event === 'messages.upsert') {
      const msg = payload.data?.message;
      const text = msg?.conversation || msg?.extendedTextMessage?.text || '[Mídia]';
      console.log(`💬 Mensagem: ${text}`);
      console.log(`👤 De: ${payload.data?.key?.fromMe ? 'Você' : 'Cliente'}`);
      console.log(`🆔 ID: ${payload.data?.key?.id}\n`);
    }
  });
});

// Manter o script rodando
console.log('🎧 Script rodando...');
console.log('⌨️  Pressione Ctrl+C para sair\n');

// Heartbeat para garantir que está vivo
setInterval(() => {
  if (socket.connected) {
    process.stdout.write('.');
  } else {
    process.stdout.write('x');
  }
}, 5000);
