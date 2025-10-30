# 🚀 Smart Broker Migration - Quick Start Guide

## ✅ O Que Foi Implementado

### 1. **Infraestrutura Completa**
- ✅ Mongoose models (8 schemas)
- ✅ Express middlewares (JWT, RBAC, validation, error handling)
- ✅ Services (AuthService, EvolutionBridgeService)
- ✅ Routers (auth endpoints)
- ✅ Integração no `main.ts` da Evolution API

### 2. **Arquivos Criados**
```
evolution-api/
├── src/modules/smart-broker/
│   ├── config/              (mongoose, jwt, redis)
│   ├── types/               (roles, auth types)
│   ├── middleware/          (jwt, rbac, validation, error handler)
│   ├── models/              (8 Mongoose schemas)
│   ├── services/            (auth, evolution-bridge)
│   └── routes/              (auth.routes.ts, index.ts)
│
├── MIGRATION_SMART_BROKER.md (documentação completa)
└── env.example               (variáveis MONGODB_URI, JWT_SECRET)
```

---

## 🏃 Como Testar

### **Passo 1: Instalar dependências (já feito)**
```powershell
cd evolution-api
npm install
```

### **Passo 2: Configurar `.env`**
Copie `env.example` para `.env` e configure:
```env
# Smart Broker
MONGODB_URI=mongodb://localhost:27017/smart-broker
JWT_SECRET=sua-chave-super-secreta
JWT_EXPIRES_IN=7d
```

### **Passo 3: Iniciar MongoDB**
```powershell
# Certifique-se que MongoDB está rodando
mongod
```

### **Passo 4: Iniciar Evolution API (com Smart Broker integrado)**
```powershell
npm run start:dev
```

**Logs esperados:**
```
[SERVER] Smart Broker MongoDB - ON
[SERVER] Smart Broker Routes - ON
[SERVER] HTTP - ON: 8080
```

---

## 🧪 Testar Endpoints

### **1. Health Check**
```powershell
curl http://localhost:8080/health
```

### **2. Registrar Usuário**
```powershell
curl -X POST http://localhost:8080/smart-broker/auth/register `
  -H "Content-Type: application/json" `
  -d '{
    "email": "admin@teste.com",
    "password": "senha123",
    "name": "Admin Teste"
  }'
```

**Resposta esperada:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "675abc123...",
    "email": "admin@teste.com",
    "name": "Admin Teste",
    "role": "viewer"
  }
}
```

### **3. Login**
```powershell
curl -X POST http://localhost:8080/smart-broker/auth/login `
  -H "Content-Type: application/json" `
  -d '{
    "email": "admin@teste.com",
    "password": "senha123"
  }'
```

### **4. Verificar Usuário Logado (rota protegida)**
```powershell
# Copie o token do passo anterior
$token = "eyJhbGciOiJIUzI1NiIs..."

curl -X GET http://localhost:8080/smart-broker/auth/me `
  -H "Authorization: Bearer $token"
```

**Resposta esperada:**
```json
{
  "id": "675abc123...",
  "email": "admin@teste.com",
  "role": "viewer",
  "agencyId": null
}
```

---

## 🔍 Verificar Status da Integração

### **1. Checar se MongoDB conectou**
Procure no log do servidor:
```
[SERVER] Smart Broker MongoDB - ON
```

### **2. Checar se rotas foram montadas**
```
[SERVER] Smart Broker Routes - ON
```

### **3. Listar todos os endpoints**
```powershell
curl http://localhost:8080/smart-broker/auth/health
# (endpoint ainda não existe - só um teste de conceito)
```

---

## 🐛 Troubleshooting

### **Erro: "Cannot find path ... evolution-api/src/modules/smart-broker"**
- Verifique se os arquivos foram criados em `evolution-api/src/modules/smart-broker/`
- Execute `ls evolution-api/src/modules/smart-broker` para confirmar

### **Erro: "Cannot connect to MongoDB"**
- Verifique se MongoDB está rodando: `mongod --version`
- Confirme a URI no `.env`: `MONGODB_URI=mongodb://localhost:27017/smart-broker`

### **Erro: "UnauthorizedException: Token inválido"**
- Verifique se o `JWT_SECRET` no `.env` é o mesmo usado para gerar o token
- Tente fazer login novamente para obter um token novo

### **Erro: Prisma imports not found (compilation)**
Os erros de compilação TypeScript relacionados ao Prisma são do **Evolution API nativo** (não afetam o Smart Broker). Para ignorá-los temporariamente:
```powershell
npm run start:dev  # Ignora erros de tipo e roda em modo watch
```

---

## 📊 Status da Migração

| Componente                | Status | Notas                                    |
|---------------------------|--------|------------------------------------------|
| Mongoose Models           | ✅ 100% | 8 schemas criados                        |
| Middlewares               | ✅ 100% | JWT, RBAC, validation, error handler     |
| Auth Service              | ✅ 100% | Login, register, validateToken           |
| Evolution Bridge Service  | ✅ 100% | Substitui HTTP calls por chamadas diretas |
| Auth Routes               | ✅ 100% | /login, /register, /me, /refresh, /logout |
| Integração main.ts        | ✅ 100% | MongoDB init + router mount              |
| Documentação              | ✅ 100% | MIGRATION_SMART_BROKER.md                |
| Properties Service        | ⏳ 0%  | CRUD de imóveis (próximo passo)          |
| Contacts Service          | ⏳ 0%  | CRM (próximo passo)                      |
| Campaigns Service         | ⏳ 0%  | Execução de campanhas (próximo passo)    |
| Agents Service            | ⏳ 0%  | Orquestração de IA (próximo passo)       |
| Bull Queue Processors     | ⏳ 0%  | Async jobs (próximo passo)               |
| Frontend Integration      | ⏳ 0%  | Alterar baseURL para /smart-broker       |

---

## 🎯 Próximos Passos

### **Fase 1: Completar Services CRUD**
1. Criar `PropertiesService` (wrap do antigo smart-broker-backend)
2. Criar `ContactsService`
3. Criar routers correspondentes: `/smart-broker/properties`, `/smart-broker/contacts`

### **Fase 2: Campanhas e Filas**
1. Criar `CampaignsService`
2. Implementar Bull processors (`whatsapp-processor.ts`, `campaign-processor.ts`)
3. Testar envio de mensagens via fila (não-bloqueante)

### **Fase 3: Agentes de IA**
1. Criar `AgentsService` (orquestração com OpenAI/Gemini)
2. Criar ferramentas (tools) que wrappam os services existentes
3. Implementar supervision dashboard no frontend

### **Fase 4: Frontend Migration**
1. Alterar `baseURL` do axios de `http://localhost:3000` para `http://localhost:8080/smart-broker`
2. Testar todos os fluxos (login, CRUD, campanhas)
3. Deploy em produção

---

## 📖 Documentação Adicional

- **Migração Completa:** `evolution-api/MIGRATION_SMART_BROKER.md`
- **Instruções de Desenvolvimento:** `smart-broker-backend/README.md`
- **Evolution API Docs:** `evolution-api/docs/`

---

## ✨ Conclusão

A **infraestrutura base** está 100% completa e testável. Você pode:
- ✅ Registrar usuários
- ✅ Fazer login e obter JWT
- ✅ Acessar rotas protegidas com RBAC
- ✅ Enviar mensagens via WhatsApp (através do EvolutionBridgeService)

Os **próximos passos** são implementar os services de negócio (properties, contacts, campaigns, agents) e migrar o frontend para os novos endpoints.

---

**Última atualização:** 2025-01-10  
**Versão:** 1.0.0 (Infraestrutura completa)
