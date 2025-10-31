require('dotenv').config();
const jwt = require('jsonwebtoken');

console.log('\n🔍 DECODIFICADOR DE TOKEN JWT\n');
console.log('Cole o token do seu navegador (localStorage) aqui e pressione Enter:');
console.log('Ou use: node decode-token.js "SEU_TOKEN_AQUI"\n');

const token = process.argv[2];

if (!token) {
  console.log('❌ Token não fornecido!');
  console.log('\nUso: node decode-token.js "SEU_TOKEN_AQUI"');
  console.log('\nOu pegue o token do navegador:');
  console.log('1. Abra DevTools (F12)');
  console.log('2. Vá em Application > Local Storage > http://localhost:5173');
  console.log('3. Procure por "token" ou "auth_token"');
  console.log('4. Copie o valor e execute: node decode-token.js "TOKEN"\n');
  process.exit(1);
}

try {
  // Decodificar SEM verificar assinatura (só para debug)
  const decoded = jwt.decode(token);
  
  console.log('📦 TOKEN DECODIFICADO:\n');
  console.log(JSON.stringify(decoded, null, 2));
  
  console.log('\n✅ Verifique o campo "role" acima!');
  console.log('   Se for "agent" → O token é antigo, precisa fazer logout/login');
  console.log('   Se for "manager" → O token está correto, o problema é outro\n');
  
  // Verificar se o token é válido (com assinatura)
  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    console.log('✅ Token válido e assinado corretamente!\n');
  } catch (err) {
    console.log('⚠️  Token inválido ou expirado:', err.message, '\n');
  }
} catch (error) {
  console.error('❌ Erro ao decodificar token:', error.message);
  console.log('\nVerifique se você copiou o token completo (formato: xxxxx.yyyyy.zzzzz)\n');
}
