# Test Scripts para Socket.IO

Este diretório contém scripts de teste para verificar a integração Socket.IO.

## 🎧 test-socket-listen.js (RECOMENDADO)

Script que **escuta** eventos do backend em tempo real.

### Como usar:

```powershell
# 1. Instale socket.io-client (se ainda não estiver)
npm install socket.io-client

# 2. Execute o listener com a API Key do .env
node test-socket-listen.js "HmaRzdaNPCcv5RBq2+vtjjJrBUnqmoW0zj5D0x+LfJw="

# 3. Em outra janela, envie uma mensagem WhatsApp real para sua instância
# OU use o Postman/Insomnia para simular webhook

# 4. Observe o log aqui!
```

### O que ele faz:

- ✅ Conecta ao backend via Socket.IO
- ✅ Escuta TODOS os eventos (messages.upsert, connection.update, etc.)
- ✅ Exibe logs detalhados de cada evento recebido
- ✅ Mostra se a conexão está ativa (heartbeat com pontos)

---

## 📤 test-socket-messages.js (Para enviar)

Script que tenta **enviar** mensagens simuladas.

**NOTA:** Este script tem limitações porque o Socket.IO do backend não aceita
mensagens de clientes externos. Ele só distribui eventos internos.

---

## 🌐 test-socket-client.html (Interface Visual)

Interface web para testar mensagens manualmente.

### Como usar:

1. Abra o arquivo no navegador:
   ```powershell
   start ../smart-broker-frontend/test-socket-client.html
   ```

2. Configure:
   - URL: http://localhost:8080
   - API Key: Cole o AUTHENTICATION_API_KEY do .env

3. Clique em "Conectar"

4. Use a interface para ver eventos em tempo real

---

## 🔍 Troubleshooting

### Erro: "Connection rejected: apiKey not provided"

**Solução:** Passe a API Key corretamente:
```powershell
node test-socket-listen.js "SUA_API_KEY_AQUI"
```

### Erro: "connect_error: transport close"

**Causas possíveis:**
1. Backend não está rodando
2. Porta 8080 ocupada
3. WEBSOCKET_ENABLED=false no .env

**Solução:**
```powershell
# Verificar se backend está rodando
curl http://localhost:8080

# Verificar .env
cat .env | Select-String "WEBSOCKET"
```

### Nenhum evento chega

**Possíveis causas:**
1. WEBSOCKET_GLOBAL_EVENTS=false no .env
2. Instância não está configurada corretamente
3. Não há mensagens sendo enviadas/recebidas

**Solução:**
```properties
# No evolution-api/.env, certifique-se que:
WEBSOCKET_ENABLED=true
WEBSOCKET_GLOBAL_EVENTS=true
```

---

## 📝 API Key

A API Key padrão está em: `evolution-api/.env`

```properties
AUTHENTICATION_API_KEY="HmaRzdaNPCcv5RBq2+vtjjJrBUnqmoW0zj5D0x+LfJw="
```

Use esta chave para autenticar nos scripts de teste.

---

## 🎯 Testando o Frontend

Depois que o listener confirmar que o backend está enviando eventos:

1. Abra o frontend: `http://localhost:5173/atendimento`
2. Faça login
3. Abra o console do navegador (F12)
4. Envie uma mensagem WhatsApp real
5. Verifique:
   - ✅ Listener mostra o evento
   - ✅ Console do navegador mostra o log do useSocketIO
   - ✅ Mensagem aparece na interface em tempo real

---

## 🚀 Fluxo Completo de Teste

```powershell
# Terminal 1: Backend
cd evolution-api
npm run start:dev

# Terminal 2: Listener (para monitorar eventos)
cd evolution-api
node test-socket-listen.js "HmaRzdaNPCcv5RBq2+vtjjJrBUnqmoW0zj5D0x+LfJw="

# Terminal 3: Frontend
cd smart-broker-frontend
npm run dev

# Navegador: Abrir frontend e enviar mensagem teste
# Observar: Listener mostra evento + Frontend atualiza em tempo real
```
