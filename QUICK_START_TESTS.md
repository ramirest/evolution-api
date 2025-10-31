# 🚀 Quick Start - Smart Broker E2E Tests

## Passo a Passo Rápido

### 1. Certifique-se de que o MongoDB está rodando

```bash
# Verificar se MongoDB está ativo
# Windows (PowerShell)
Get-Service -Name MongoDB

# Linux/Mac
sudo systemctl status mongod
```

### 2. Configure as variáveis de ambiente

Crie/edite o arquivo `.env` na raiz do `evolution-api`:

```env
# MongoDB
MONGODB_URI=mongodb://localhost:27017/smart-broker

# JWT
JWT_SECRET=your-super-secret-key-change-this-in-production

# IA (Opcional - para testes de agentes)
OPENAI_API_KEY=sk-your-openai-key-here
AI_PROVIDER=openai

# OU para usar Gemini
# GEMINI_API_KEY=your-gemini-key-here
# AI_PROVIDER=google
```

### 3. Inicie o servidor

```bash
cd evolution-api
npm run dev:server
```

Aguarde até ver:
```
🚀 Server running on: http://localhost:8080
📱 Smart Broker Module: /api/smart-broker
```

### 4. Execute os testes (em outro terminal)

```bash
cd evolution-api
npm run test:e2e
```

## ✅ Resultado Esperado

Se tudo estiver correto, você verá:

```
=================================================
🚀 SMART BROKER E2E TESTS
=================================================

[E2E] TEST 1: Registro de usuários
✅ Admin registrado com sucesso
✅ Manager registrado com sucesso
✅ Agent registrado com sucesso

... (mais 10 testes)

=================================================
✅ TODOS OS TESTES PASSARAM!
=================================================
```

## ❌ Problemas Comuns

### "ECONNREFUSED" ou "connect ECONNREFUSED ::1:8080"
**Causa**: Servidor não está rodando  
**Solução**: Execute `npm run dev:server` primeiro

### "MongoServerError: Authentication failed"
**Causa**: MongoDB não está acessível ou credenciais incorretas  
**Solução**: 
- Verifique se MongoDB está rodando
- Confirme a string de conexão no `.env`

### "IA está desabilitada" nos logs do agente
**Causa**: API keys de IA não configuradas  
**Solução**: Adicione `OPENAI_API_KEY` ou `GEMINI_API_KEY` no `.env`  
**Nota**: O teste passa mesmo sem IA (modo stub)

### Testes travados/demorados
**Causa**: Processamento assíncrono do agente de IA  
**Solução**: Normal - aguarde até 30s por teste

## 📊 Testes Individuais

Para testar endpoints específicos manualmente:

```bash
# 1. Registrar usuário
curl -X POST http://localhost:8080/api/smart-broker/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"Test@123","name":"Test User","role":"admin"}'

# 2. Login
curl -X POST http://localhost:8080/api/smart-broker/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"Test@123"}'

# 3. Listar imóveis (substitua TOKEN)
curl -X GET http://localhost:8080/api/smart-broker/properties \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## 🔄 Re-executar Testes

Os testes criam dados únicos (email com timestamp), então podem ser executados múltiplas vezes sem conflito.

Para limpar o banco entre execuções:

```bash
# Conectar ao MongoDB
mongosh

# Selecionar database
use smart-broker

# Dropar collections
db.users.drop()
db.agencies.drop()
db.properties.drop()
db.contacts.drop()
db.campaigns.drop()
db.agentsessions.drop()
```

## 📝 Próximo Passo

Após validar que os testes passam, consulte:
- `test/smart-broker/README.md` - Documentação completa dos testes
- `MIGRATION_SMART_BROKER.md` - Status da migração completa
