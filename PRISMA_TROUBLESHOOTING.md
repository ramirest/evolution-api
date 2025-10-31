# 🔧 Prisma Client Troubleshooting Guide

## 🚨 Problema: "@prisma/client did not initialize yet"

Este erro ocorre quando o Prisma Client não foi gerado antes do servidor iniciar.

---

## ✅ Solução Aplicada

### 1. Script `predev:server` Adicionado

O `package.json` agora inclui um hook **pre-script** que executa **automaticamente** antes de `npm run dev:server`:

```json
{
  "scripts": {
    "predev:server": "npm run db:generate",
    "dev:server": "tsx watch ./src/main.ts"
  }
}
```

**Como funciona:**
- Quando você executa `npm run dev:server`
- O npm **primeiro** executa `predev:server` (gera o Prisma Client)
- **Depois** executa `dev:server` (inicia o servidor)

### 2. Sistema de Providers Dinâmico

O Evolution API suporta múltiplos bancos de dados:
- **PostgreSQL** (padrão)
- **MySQL**
- **psql_bouncer** (PostgreSQL com bouncer)

O script `runWithProvider.js` substitui `DATABASE_PROVIDER` pelo valor do `.env`.

---

## 🚀 Como Usar

### Primeira Vez (Setup Inicial)

```bash
# 1. Configure o .env
cp .env.example .env

# 2. Edite o .env e defina:
DATABASE_PROVIDER=postgresql  # ou mysql, psql_bouncer
DATABASE_URL=postgresql://user:password@localhost:5432/evolution

# 3. Gere o Prisma Client manualmente (primeira vez)
npm run db:generate

# 4. Execute as migrations (se necessário)
npm run db:deploy:win  # Windows
# OU
npm run db:deploy      # Linux/Mac

# 5. Inicie o servidor
npm run dev:server
```

### Uso Normal (Depois do Setup)

```bash
# Simplesmente execute:
npm run dev:server

# O Prisma Client será gerado automaticamente!
```

---

## 🔍 Diagnóstico de Problemas

### Erro: "Could not find Prisma Schema"

**Causa:** Variável `DATABASE_PROVIDER` não está definida no `.env`

**Solução:**
```bash
# Verifique o .env
DATABASE_PROVIDER=postgresql
```

### Erro: "Prisma Client is not initialized"

**Causa:** Prisma Client não foi gerado

**Solução:**
```bash
# Gere manualmente
npm run db:generate

# Ou reinstale dependências
npm install
```

### Erro: "Can't reach database server"

**Causa:** Database não está rodando ou URL incorreta

**Solução:**
```bash
# Verifique se PostgreSQL/MySQL está rodando
# Windows (PostgreSQL)
Get-Service -Name postgresql*

# Verifique a DATABASE_URL no .env
DATABASE_URL=postgresql://user:password@localhost:5432/dbname
```

### Erro: "Migration required"

**Causa:** Schema mudou e precisa de migration

**Solução:**
```bash
# Windows
npm run db:deploy:win

# Linux/Mac
npm run db:deploy
```

---

## 📋 Scripts Disponíveis

| Script | Descrição |
|--------|-----------|
| `npm run db:generate` | Gera o Prisma Client |
| `npm run db:deploy` | Aplica migrations (Linux/Mac) |
| `npm run db:deploy:win` | Aplica migrations (Windows) |
| `npm run db:studio` | Abre Prisma Studio (GUI) |
| `npm run db:migrate:dev` | Cria nova migration (dev) |
| `npm run db:migrate:dev:win` | Cria nova migration (Windows) |

---

## 🗂️ Estrutura de Schemas

```
prisma/
├── postgresql-schema.prisma       # Schema PostgreSQL
├── mysql-schema.prisma            # Schema MySQL
├── psql_bouncer-schema.prisma     # Schema PostgreSQL Bouncer
├── postgresql-migrations/         # Migrations PostgreSQL
├── mysql-migrations/              # Migrations MySQL
└── migrations/                    # Migrations ativas (geradas dinamicamente)
```

---

## 🔄 Fluxo Completo

```mermaid
graph LR
    A[npm run dev:server] --> B[predev:server executa]
    B --> C[db:generate roda]
    C --> D[runWithProvider.js]
    D --> E[Lê DATABASE_PROVIDER do .env]
    E --> F[Substitui DATABASE_PROVIDER no comando]
    F --> G[prisma generate --schema=./prisma/postgresql-schema.prisma]
    G --> H[Prisma Client gerado]
    H --> I[dev:server inicia]
    I --> J[Servidor rodando ✅]
```

---

## 💡 Dicas Importantes

### 1. Sempre configure o `.env` primeiro
```bash
DATABASE_PROVIDER=postgresql
DATABASE_URL=postgresql://localhost:5432/evolution
```

### 2. Se mudar o provider, regenere o client
```bash
# Exemplo: mudou de postgresql para mysql
DATABASE_PROVIDER=mysql
npm run db:generate
```

### 3. Em produção, use `postinstall`
O `postinstall` gera automaticamente o client após `npm install`:
```json
"postinstall": "npm run db:generate"
```

### 4. Para debugar, use logs
```bash
# Veja os comandos sendo executados
DATABASE_PROVIDER=postgresql node runWithProvider.js "echo teste"
```

---

## 🎯 Checklist de Validação

Antes de iniciar o servidor, verifique:

- [ ] `.env` existe e está configurado
- [ ] `DATABASE_PROVIDER` definido (postgresql/mysql/psql_bouncer)
- [ ] `DATABASE_URL` correto para o provider escolhido
- [ ] Database está rodando e acessível
- [ ] `npm install` foi executado
- [ ] `npm run db:generate` rodou sem erros

Se todos os itens estiverem ✅, execute:
```bash
npm run dev:server
```

---

## 🆘 Troubleshooting Avançado

### Reset Completo

Se nada funcionar, faça um reset completo:

```bash
# 1. Limpar node_modules
rm -rf node_modules
rm package-lock.json

# 2. Limpar Prisma Client gerado
rm -rf node_modules/.prisma
rm -rf node_modules/@prisma

# 3. Reinstalar
npm install

# 4. Gerar Prisma Client
npm run db:generate

# 5. Testar
npm run dev:server
```

### Verificar Prisma Client Gerado

```bash
# Deve existir:
node_modules/.prisma/client/index.js
node_modules/@prisma/client/
```

### Logs Detalhados do Prisma

```bash
# Ativar debug do Prisma
DEBUG=prisma:* npm run dev:server
```

---

## 📚 Recursos Adicionais

- [Prisma Docs - Multiple Schemas](https://www.prisma.io/docs/guides/database/multi-schema)
- [Evolution API Docs](https://doc.evolution-api.com)
- [Prisma Client Generation](https://www.prisma.io/docs/concepts/components/prisma-client/generating)

---

**Última Atualização:** 31 de Outubro de 2025  
**Status:** ✅ Problema Corrigido
