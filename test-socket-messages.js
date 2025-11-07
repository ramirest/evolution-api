/**
 * Script de Teste - Simulação de Mensagens Socket.IO
 * 
 * Este script simula mensagens chegando via WhatsApp para testar o sistema
 * de tempo real do frontend sem precisar de um dispositivo WhatsApp real.
 * 
 * Como usar:
 * 1. Certifique-se que o backend está rodando (npm run start:dev)
 * 2. Pegue o AUTHENTICATION_API_KEY do arquivo .env do backend
 * 3. Execute: node test-socket-messages.js HmaRzdaNPCcv5RBq2+vtjjJrBUnqmoW0zj5D0x+LfJw=
 * 4. Abra o frontend e vá para a página de Atendimento
 * 5. Observe as mensagens aparecendo em tempo real!
 */

const { io } = require('socket.io-client');

// Configurações
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8080';
const API_KEY = process.argv[2] || process.env.API_KEY || 'HmaRzdaNPCcv5RBq2+vtjjJrBUnqmoW0zj5D0x+LfJw=';
const INSTANCE_NAME = 'test-instance';

// Mostrar configurações
console.log('\n╔════════════════════════════════════════════════════════════╗');
console.log('║  SIMULADOR DE MENSAGENS SOCKET.IO - SMART BROKER          ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');
console.log('📋 Configurações:');
console.log(`   Backend URL: ${BACKEND_URL}`);
console.log(`   API Key: ${API_KEY.substring(0, 20)}...`);
console.log(`   Instance: ${INSTANCE_NAME}\n`);

// Conectar ao Socket.IO do backend
console.log('🔌 Conectando ao backend...');

const socket = io(BACKEND_URL, {
  query: { apikey: API_KEY },
  transports: ['websocket'],
  reconnection: false,
});

socket.on('connect', () => {
  console.log('✅ Conectado ao backend!');
  console.log(`   Socket ID: ${socket.id}`);
  console.log('📡 Iniciando simulação de mensagens em 2 segundos...\n');
  
  setTimeout(() => {
    startSimulation();
  }, 2000);
});

socket.on('connect_error', (error) => {
  console.error('\n❌ ERRO DE CONEXÃO:', error.message);
  console.log('\n💡 Dicas de troubleshooting:');
  console.log('   1. Backend está rodando? Execute: npm run start:dev');
  console.log('   2. API_KEY correta? Verifique evolution-api/.env → AUTHENTICATION_API_KEY');
  console.log('   3. Porta 8080 disponível? Verifique se não há conflitos');
  console.log('   4. WebSocket habilitado? Verifique WEBSOCKET_ENABLED=true no .env\n');
  console.log('📝 Comando correto:');
  console.log('   node test-socket-messages.js "sua-api-key-aqui"\n');
  process.exit(1);
});

socket.on('disconnect', (reason) => {
  console.log('🔌 Desconectado:', reason);
});

// Função principal de simulação
function startSimulation() {
  console.log('════════════════════════════════════════════════════════════');
  console.log('🎭 SIMULADOR DE MENSAGENS WHATSAPP - SMART BROKER');
  console.log('════════════════════════════════════════════════════════════\n');

  // Simular diferentes tipos de mensagens
  const scenarios = [
    {
      name: '💬 Mensagem de Texto Simples',
      delay: 1000,
      fn: () => simulateTextMessage('Olá! Gostaria de informações sobre imóveis.')
    },
    {
      name: '📱 Mensagem do Cliente (fromMe: false)',
      delay: 3000,
      fn: () => simulateClientMessage('Vocês tem apartamentos de 2 quartos?')
    },
    {
      name: '👤 Resposta do Corretor (fromMe: true)',
      delay: 5000,
      fn: () => simulateAgentMessage('Sim! Temos várias opções. Qual bairro você prefere?')
    },
    {
      name: '🖼️ Mensagem com Imagem',
      delay: 7000,
      fn: () => simulateImageMessage('Aqui está a foto do apartamento!')
    },
    {
      name: '🎥 Mensagem com Vídeo',
      delay: 9000,
      fn: () => simulateVideoMessage('Tour virtual do imóvel')
    },
    {
      name: '🔊 Mensagem com Áudio',
      delay: 11000,
      fn: () => simulateAudioMessage()
    },
    {
      name: '📄 Mensagem com Documento',
      delay: 13000,
      fn: () => simulateDocumentMessage('Contrato_Locacao.pdf')
    },
    {
      name: '🔄 Sequência Rápida de Mensagens',
      delay: 15000,
      fn: () => simulateConversation()
    },
  ];

  // Executar cada cenário
  scenarios.forEach(scenario => {
    setTimeout(() => {
      console.log(`\n${scenario.name}`);
      console.log('─'.repeat(60));
      scenario.fn();
    }, scenario.delay);
  });

  // Finalizar após todos os testes
  setTimeout(() => {
    console.log('\n════════════════════════════════════════════════════════════');
    console.log('✅ Simulação concluída!');
    console.log('════════════════════════════════════════════════════════════\n');
    console.log('💡 Verifique o frontend para ver as mensagens em tempo real!');
    console.log('🔄 Para executar novamente, rode: node test-socket-messages.js\n');
    socket.disconnect();
    process.exit(0);
  }, 18000);
}

// ═══════════════════════════════════════════════════════════════════════════
// FUNÇÕES DE SIMULAÇÃO
// ═══════════════════════════════════════════════════════════════════════════

function simulateTextMessage(text) {
  const payload = createMessagePayload({
    text,
    fromMe: false,
    messageType: 'conversation',
  });
  
  emitMessage(payload);
}

function simulateClientMessage(text) {
  const payload = createMessagePayload({
    text,
    fromMe: false,
    messageType: 'conversation',
  });
  
  emitMessage(payload);
}

function simulateAgentMessage(text) {
  const payload = createMessagePayload({
    text,
    fromMe: true,
    messageType: 'conversation',
  });
  
  emitMessage(payload);
}

function simulateImageMessage(caption) {
  const payload = createMessagePayload({
    text: caption,
    fromMe: false,
    messageType: 'imageMessage',
    media: {
      mimetype: 'image/jpeg',
      filename: 'apartamento_foto1.jpg',
      // Imagem de exemplo em base64 (1x1 pixel vermelho - para teste)
      data: '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA8A/9k=',
    },
  });
  
  emitMessage(payload);
}

function simulateVideoMessage(caption) {
  const payload = createMessagePayload({
    text: caption,
    fromMe: false,
    messageType: 'videoMessage',
    media: {
      mimetype: 'video/mp4',
      filename: 'tour_virtual.mp4',
      data: 'AAAAIGZ0eXBpc29tAAACAGlzb21pc28yYXZjMW1wNDEAAAAIZnJlZQAAAb', // Placeholder
    },
  });
  
  emitMessage(payload);
}

function simulateAudioMessage() {
  const payload = createMessagePayload({
    text: '[Áudio]',
    fromMe: false,
    messageType: 'audioMessage',
    media: {
      mimetype: 'audio/ogg; codecs=opus',
      filename: 'audio.ogg',
      data: 'T2dnUwACAAAAAAAAAABzaWduYXR1cmUAAAAAAAAAAAAAAAA', // Placeholder
    },
  });
  
  emitMessage(payload);
}

function simulateDocumentMessage(filename) {
  const payload = createMessagePayload({
    text: `[Documento: ${filename}]`,
    fromMe: true,
    messageType: 'documentMessage',
    media: {
      mimetype: 'application/pdf',
      filename,
      data: 'JVBERi0xLjQKJeLjz9MKMSAwIG9iago8PAovVHlwZSAvQ2F0YWxvZw', // Placeholder
    },
  });
  
  emitMessage(payload);
}

function simulateConversation() {
  const messages = [
    { text: 'Qual o valor do aluguel?', fromMe: false, delay: 0 },
    { text: 'O valor é R$ 1.500,00 + condomínio', fromMe: true, delay: 1500 },
    { text: 'Aceita pets?', fromMe: false, delay: 3000 },
    { text: 'Sim, aceitamos pets de pequeno porte! 🐕', fromMe: true, delay: 4500 },
  ];

  messages.forEach(msg => {
    setTimeout(() => {
      const payload = createMessagePayload({
        text: msg.text,
        fromMe: msg.fromMe,
        messageType: 'conversation',
      });
      emitMessage(payload);
    }, msg.delay);
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// FUNÇÕES AUXILIARES
// ═══════════════════════════════════════════════════════════════════════════

function createMessagePayload({ text, fromMe, messageType, media }) {
  const timestamp = Math.floor(Date.now() / 1000);
  const messageId = `TEST_MSG_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const remoteJid = '5511999999999@s.whatsapp.net'; // Número de teste

  const basePayload = {
    event: 'messages.upsert',
    instance: INSTANCE_NAME,
    data: {
      key: {
        remoteJid,
        fromMe,
        id: messageId,
      },
      messageTimestamp: timestamp,
      pushName: fromMe ? 'Smart Broker' : 'Cliente Teste',
    },
    server_url: BACKEND_URL,
    date_time: new Date().toISOString(),
    sender: fromMe ? 'system' : remoteJid,
    apikey: API_KEY,
  };

  // Adicionar o conteúdo da mensagem baseado no tipo
  if (messageType === 'conversation') {
    basePayload.data.message = {
      conversation: text,
    };
  } else if (messageType === 'imageMessage') {
    basePayload.data.message = {
      imageMessage: {
        caption: text,
        mimetype: media.mimetype,
        url: `data:${media.mimetype};base64,${media.data}`,
      },
    };
    basePayload.hasMedia = true;
    basePayload.media = media;
  } else if (messageType === 'videoMessage') {
    basePayload.data.message = {
      videoMessage: {
        caption: text,
        mimetype: media.mimetype,
        url: `data:${media.mimetype};base64,${media.data}`,
      },
    };
    basePayload.hasMedia = true;
    basePayload.media = media;
  } else if (messageType === 'audioMessage') {
    basePayload.data.message = {
      audioMessage: {
        mimetype: media.mimetype,
        url: `data:${media.mimetype};base64,${media.data}`,
      },
    };
    basePayload.hasMedia = true;
    basePayload.media = media;
  } else if (messageType === 'documentMessage') {
    basePayload.data.message = {
      documentMessage: {
        caption: text,
        mimetype: media.mimetype,
        fileName: media.filename,
        url: `data:${media.mimetype};base64,${media.data}`,
      },
    };
    basePayload.hasMedia = true;
    basePayload.media = media;
  }

  return basePayload;
}

function emitMessage(payload) {
  // IMPORTANTE: O backend escuta em 'messages.upsert' e distribui para os clientes
  // Mas como cliente, não podemos emitir para outros clientes.
  // Então vamos simular recebendo diretamente o evento que o backend emitiria
  
  console.log(`📤 Simulando mensagem: "${getMessagePreview(payload)}"`);
  console.log(`   ID: ${payload.data.key.id}`);
  console.log(`   De: ${payload.data.key.fromMe ? 'Corretor' : 'Cliente'}`);
  console.log(`   Tipo: ${getMessageType(payload)}`);
  
  if (payload.hasMedia) {
    console.log(`   📎 Mídia: ${payload.media.mimetype} (${payload.media.filename})`);
  }
  
  // Emitir o evento para que outros clientes (frontend) recebam
  // Nota: Isso só funcionará se o backend realmente distribuir eventos entre clientes
  socket.emit('messages.upsert', payload);
}

function getMessagePreview(payload) {
  const msg = payload.data.message;
  if (msg.conversation) return msg.conversation;
  if (msg.extendedTextMessage?.text) return msg.extendedTextMessage.text;
  if (msg.imageMessage?.caption) return msg.imageMessage.caption || '[Imagem]';
  if (msg.videoMessage?.caption) return msg.videoMessage.caption || '[Vídeo]';
  if (msg.audioMessage) return '[Áudio]';
  if (msg.documentMessage) return `[Documento: ${msg.documentMessage.fileName}]`;
  return '[Mensagem sem conteúdo]';
}

function getMessageType(payload) {
  const msg = payload.data.message;
  if (msg.conversation) return 'Texto';
  if (msg.extendedTextMessage) return 'Texto Estendido';
  if (msg.imageMessage) return 'Imagem';
  if (msg.videoMessage) return 'Vídeo';
  if (msg.audioMessage) return 'Áudio';
  if (msg.documentMessage) return 'Documento';
  return 'Desconhecido';
}

// ═══════════════════════════════════════════════════════════════════════════
// MENSAGENS DE AJUDA
// ═══════════════════════════════════════════════════════════════════════════

if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
╔═══════════════════════════════════════════════════════════════════╗
║  SIMULADOR DE MENSAGENS SOCKET.IO - SMART BROKER                 ║
╚═══════════════════════════════════════════════════════════════════╝

USO:
  node test-socket-messages.js [opções]

OPÇÕES:
  --help, -h     Mostrar esta ajuda

VARIÁVEIS DE AMBIENTE:
  API_KEY        Chave de autenticação do backend (obrigatória)

EXEMPLOS:
  # Com variável de ambiente
  API_KEY=sua-api-key node test-socket-messages.js

  # Windows PowerShell
  $env:API_KEY="sua-api-key"; node test-socket-messages.js

ANTES DE EXECUTAR:
  1. Certifique-se que o backend está rodando
  2. Configure a API_KEY correta
  3. Abra o frontend em /atendimento
  4. Execute este script e observe as mensagens chegando!

TIPOS DE MENSAGENS SIMULADAS:
  • Texto simples
  • Mensagem do cliente (fromMe: false)
  • Mensagem do corretor (fromMe: true)
  • Imagem com legenda
  • Vídeo
  • Áudio
  • Documento PDF
  • Sequência de conversação

  `);
  process.exit(0);
}
