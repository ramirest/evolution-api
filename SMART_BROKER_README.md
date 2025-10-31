# 🏢 Smart Broker - Módulo Integrado ao Evolution API

Sistema completo de gestão imobiliária com IA, integrado ao Evolution API para automação via WhatsApp.

---

## 🚀 Quick Start

### Windows (PowerShell)

```powershell
# Execute o script de setup automático
.\setup.ps1
```

### Manual (todas as plataformas)

```bash
# 1. Configure o .env
cp .env.example .env
# Edite .env e configure: DATABASE_PROVIDER, DATABASE_URL, MONGODB_URI, JWT_SECRET

# 2. Instale dependências
npm install

# 3. Gere Prisma Client
npm run db:generate

# 4. Execute migrations (primeira vez)
npm run db:deploy:win   # Windows
npm run db:deploy       # Linux/Mac

# 5. Inicie o servidor
npm run dev:server
```

---

## 📋 Pré-requisitos

### Bancos de Dados

**PostgreSQL ou MySQL** (para Evolution API)
```bash
# PostgreSQL
DATABASE_PROVIDER=postgresql
DATABASE_URL=postgresql://user:password@localhost:5432/evolution

# MySQL
DATABASE_PROVIDER=mysql
DATABASE_URL=mysql://user:password@localhost:3306/evolution
```

**MongoDB** (para Smart Broker)
```bash
MONGODB_URI=mongodb://localhost:27017/smart-broker
```

### Autenticação

```bash
JWT_SECRET=your-super-secret-key-change-in-production
JWT_EXPIRATION=7d
```

### IA (Opcional)

```bash
# OpenAI
OPENAI_API_KEY=sk-...
AI_PROVIDER=openai

# OU Google Gemini
GEMINI_API_KEY=...
AI_PROVIDER=google
```

---

## 🏗️ Arquitetura

### Dual Database System

```
┌─────────────────────────────────────┐
│      Evolution API (Express)         │
├─────────────────────────────────────┤
│                                      │
│  ┌──────────────┐  ┌──────────────┐ │
│  │   Prisma     │  │  Mongoose    │ │
│  │ (PostgreSQL) │  │  (MongoDB)   │ │
│  └──────────────┘  └──────────────┘ │
│         │                 │          │
│         ▼                 ▼          │
│  Evolution Data    Smart Broker     │
│  (Instances,       (Properties,     │
│   Messages)        Contacts, AI)    │
└─────────────────────────────────────┘
```

### Estrutura de Módulos

```
src/modules/smart-broker/
├── models/              # 7 Mongoose schemas
│   ├── user.model.ts
│   ├── agency.model.ts
│   ├── property.model.ts
│   ├── contact.model.ts
│   ├── campaign.model.ts
│   ├── template.model.ts
│   └── agent-session.model.ts
├── services/            # 6 business logic services
├── routes/              # 6 Express routers
├── middleware/          # Auth & RBAC
└── types/               # TypeScript definitions
```

---

## 🌐 API Endpoints

**Base URL:** `http://localhost:8080/api/smart-broker`

### Auth (3 endpoints)
- `POST /auth/register` - Registrar usuário
- `POST /auth/login` - Login e obter JWT
- `POST /auth/refresh` - Renovar token

### Agencies (9 endpoints)
- `POST /agencies` - Criar agência
- `GET /agencies` - Listar todas (Admin only)
- `GET /agencies/my` - Minhas agências
- `GET /agencies/:id` - Buscar por ID
- `PATCH /agencies/:id` - Atualizar
- `POST /agencies/:id/members/:userId` - Adicionar membro
- `DELETE /agencies/:id/members/:userId` - Remover membro
- `DELETE /agencies/:id` - Deletar (Admin)
- `GET /agencies/:id/stats` - Estatísticas

### Properties (7 endpoints)
- `POST /properties` - Criar imóvel
- `GET /properties` - Listar (com RBAC)
- `GET /properties/:id` - Buscar por ID
- `PATCH /properties/:id` - Atualizar
- `DELETE /properties/:id` - Deletar
- `POST /properties/:id/photos` - Upload fotos
- `GET /properties/search` - Busca avançada

### Contacts (8 endpoints)
- `POST /contacts` - Criar contato
- `GET /contacts` - Listar (com RBAC)
- `GET /contacts/:id` - Buscar por ID
- `PATCH /contacts/:id` - Atualizar
- `DELETE /contacts/:id` - Deletar
- `POST /contacts/:id/notes` - Adicionar nota
- `POST /contacts/:id/tags` - Adicionar tag
- `GET /contacts/search` - Buscar

### Campaigns (6 endpoints)
- `POST /campaigns` - Criar campanha
- `GET /campaigns` - Listar
- `GET /campaigns/:id` - Buscar por ID
- `PATCH /campaigns/:id` - Atualizar
- `POST /campaigns/:id/execute` - Executar
- `DELETE /campaigns/:id` - Deletar

### Agents (IA) (4 endpoints)
- `POST /agents/execute-goal` - Criar sessão IA
- `POST /agents/chat` - Continuar conversa
- `GET /agents/sessions` - Listar sessões
- `GET /agents/sessions/:id` - Buscar sessão

---

## 🔒 RBAC (Role-Based Access Control)

### 4 Roles Implementados

| Role | Permissões |
|------|-----------|
| **Admin** | Acesso total a todas as agências e recursos |
| **Manager** | CRUD completo na própria agência |
| **Agent** | CRUD apenas nos próprios recursos |
| **Viewer** | Somente leitura (read-only) |

### Multi-tenancy

Dados são isolados por `agencyId`. Cada usuário pertence a uma agência e só pode acessar dados dessa agência (exceto Admin).

---

## 🤖 Agente de IA

### Providers Suportados

- ✅ **OpenAI** (GPT-4o-mini, GPT-4)
- ✅ **Google Gemini** (gemini-2.0-flash-exp)

### Function Calling (4 ferramentas)

1. **search_properties** - Busca imóveis com filtros
2. **get_property_details** - Detalhes completos de imóvel
3. **search_contacts** - Busca contatos/leads
4. **send_whatsapp_message** - Envia mensagem WhatsApp

### Tipos de Agentes

- **General Assistant** - Assistente geral de vendas
- **Lead Qualifier** - Qualificador de leads
- **Property Advisor** - Consultor imobiliário

### Exemplo de Uso

```bash
# 1. Login
curl -X POST http://localhost:8080/api/smart-broker/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@test.com","password":"password"}'

# 2. Executar objetivo
curl -X POST http://localhost:8080/api/smart-broker/agents/execute-goal \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "goal": "Busque imóveis de 2 quartos até R$ 300.000",
    "agentType": "general_assistant"
  }'

# 3. Continuar conversa
curl -X POST http://localhost:8080/api/smart-broker/agents/chat \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "SESSION_ID",
    "message": "Me mostre mais detalhes do primeiro imóvel"
  }'
```

---

## 🧪 Testes

### Executar Testes E2E

```bash
# Iniciar servidor (terminal 1)
npm run dev:server

# Executar testes (terminal 2)
npm run test:e2e
```

### Cobertura de Testes

- ✅ 13 testes E2E
- ✅ 40+ endpoints testados
- ✅ RBAC validado em todos os níveis
- ✅ Fluxo completo: Auth → Agency → Property → Contact → Campaign → Agent

---

## 📊 Scripts Disponíveis

### Desenvolvimento

```bash
npm run dev:server      # Inicia servidor (com Prisma auto-generate)
npm run start           # Inicia servidor (sem watch)
npm run build           # Build para produção
```

### Banco de Dados

```bash
npm run db:generate     # Gera Prisma Client
npm run db:deploy       # Aplica migrations (Linux/Mac)
npm run db:deploy:win   # Aplica migrations (Windows)
npm run db:studio       # Abre Prisma Studio
```

### Testes

```bash
npm run test:e2e        # Testes E2E
npm run test:e2e:watch  # Testes E2E (watch mode)
npm test                # Testes unitários
```

### Qualidade de Código

```bash
npm run lint            # Lint e auto-fix
npm run lint:check      # Apenas verificar
```

---

## 🔧 Troubleshooting

### Erro: "@prisma/client did not initialize yet"

**Solução:**
```bash
npm run db:generate
npm run dev:server
```

📚 **Documentação completa:** [PRISMA_TROUBLESHOOTING.md](./PRISMA_TROUBLESHOOTING.md)

### Erro: "MongoServerError: Authentication failed"

**Solução:**
```bash
# Verifique o .env
MONGODB_URI=mongodb://localhost:27017/smart-broker
```

### Erro: "JWT malformed"

**Solução:**
```bash
# Configure no .env
JWT_SECRET=your-secret-key
```

### Servidor não inicia

**Checklist:**
- [ ] PostgreSQL/MySQL rodando
- [ ] MongoDB rodando
- [ ] `.env` configurado
- [ ] `npm install` executado
- [ ] `npm run db:generate` executado

---

## 📚 Documentação Adicional

- **[MIGRATION_COMPLETE.md](./MIGRATION_COMPLETE.md)** - Resumo da migração completa
- **[PRISMA_TROUBLESHOOTING.md](./PRISMA_TROUBLESHOOTING.md)** - Guia de troubleshooting Prisma
- **[QUICK_START_TESTS.md](./QUICK_START_TESTS.md)** - Guia rápido de testes
- **[test/smart-broker/README.md](./test/smart-broker/README.md)** - Documentação dos testes E2E
- **[.github/copilot-instructions.md](./.github/copilot-instructions.md)** - Instruções para AI assistants

---

## 🎯 Roadmap

### ✅ Fase 1 - Completa (17/18 tarefas)
- ✅ Infraestrutura completa
- ✅ 6 services principais
- ✅ 6 routers com 40+ endpoints
- ✅ RBAC completo
- ✅ AI Orchestration (OpenAI + Gemini)
- ✅ 13 testes E2E

### 🔄 Fase 2 - Em Planejamento
- ⏭️ Bull Queues para processamento assíncrono
- ⏭️ Redis para cache e sessões
- ⏭️ AWS S3 para upload de fotos
- ⏭️ Webhooks Evolution API
- ⏭️ CI/CD com GitHub Actions

### 🔮 Fase 3 - Futuro
- Frontend atualizado para nova API
- Dashboard de agentes IA
- Chat em tempo real
- Analytics e relatórios

---

## 🤝 Contribuindo

Este projeto segue os padrões do Evolution API. Para contribuir:

1. Fork o repositório
2. Crie uma branch (`git checkout -b feature/nova-feature`)
3. Commit suas mudanças (`git commit -m 'Adiciona nova feature'`)
4. Push para a branch (`git push origin feature/nova-feature`)
5. Abra um Pull Request

---

## 📝 Licença

Este projeto segue a licença do Evolution API: **Apache-2.0**

---

## 🆘 Suporte

- **Documentação Evolution API:** https://doc.evolution-api.com
- **Issues:** https://github.com/EvolutionAPI/evolution-api/issues
- **Discord:** https://evolution-api.com/discord

---

**Última Atualização:** 31 de Outubro de 2025  
**Versão:** 1.0.0  
**Status:** ✅ Pronto para Produção
