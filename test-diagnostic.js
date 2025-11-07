/**
 * Teste SUPER SIMPLES de conexão Socket.IO
 * 
 * Este é o teste mais básico possível.
 * Se este não funcionar, o problema é configuração do WebSocket no backend.
 */

const { io } = require('socket.io-client');

const API_KEY = 'HmaRzdaNPCcv5RBq2+vtjjJrBUnqmoW0zj5D0x+LfJw=';

console.log('\n🔍 DIAGNÓSTICO SOCKET.IO\n');
console.log('Tentando conectar em: http://localhost:8080');
console.log('API Key:', API_KEY.substring(0, 20) + '...\n');

// Teste 1: Conexão básica
console.log('📡 Teste 1: Tentando conexão WebSocket...');
const socket = io('http://localhost:8080', {
  query: { apikey: API_KEY },
  transports: ['websocket'],
  reconnection: false,
  timeout: 5000,
});

socket.on('connect', () => {
  console.log('✅ SUCESSO! WebSocket conectado!');
  console.log('   Socket ID:', socket.id);
  console.log('   Transport:', socket.io.engine.transport.name);
  console.log('\n🎉 O WebSocket está funcionando perfeitamente!');
  console.log('   Problema deve ser na lógica de emissão/escuta de eventos.\n');
  process.exit(0);
});

socket.on('connect_error', (error) => {
  console.log('❌ FALHA na conexão WebSocket');
  console.log('   Erro:', error.message);
  console.log('\n🔍 Diagnóstico:');
  
  if (error.message.includes('apikey') || error.message.includes('Authentication')) {
    console.log('   ⚠️  Problema: API Key inválida ou não reconhecida');
    console.log('   ✅ Solução: Verifique o AUTHENTICATION_API_KEY no .env do backend');
  } else if (error.message.includes('websocket error')) {
    console.log('   ⚠️  Problema: WebSocket não está habilitado no backend');
    console.log('   ✅ Solução: Adicione no .env:');
    console.log('      WEBSOCKET_ENABLED=true');
    console.log('      WEBSOCKET_GLOBAL_EVENTS=true');
    console.log('   🔄 Depois REINICIE o backend!');
  } else {
    console.log('   ⚠️  Problema: Outro erro de conexão');
    console.log('   ✅ Solução: Verifique se o backend está realmente rodando');
  }
  
  console.log('\n');
  process.exit(1);
});

socket.on('disconnect', (reason) => {
  console.log('🔌 Desconectado:', reason);
});

// Timeout de segurança
setTimeout(() => {
  console.log('\n⏱️  TIMEOUT: Não conseguiu conectar em 5 segundos');
  console.log('   O backend provavelmente não está aceitando conexões WebSocket.\n');
  process.exit(1);
}, 5000);
