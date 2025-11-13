# 🧪 Teste de Upload de Imagens via Agente IA

## Data da Implementação
2025-11-13

## Objetivo
Permitir que o agente (General Assistant) crie imóveis com imagens anexadas diretamente via chat, sem necessidade de formulários.

## Arquivos Modificados/Criados

### ✨ Criados
1. **`create-property.tool.ts`** - Ferramenta de criação de imóvel com validação Zod

### ✏️ Modificados
1. **`agents.routes.ts`** - Adicionado Multer e processamento de arquivos
2. **`agents.service.ts`** - Suporte a `uploadedImageUrls` e `rejectedFiles`
3. **`agents/tools/index.ts`** - Exportação da nova ferramenta

## Fluxo Implementado

### 1. Frontend → Backend (Upload)
```typescript
// Frontend envia multipart/form-data para POST /agents/chat
FormData {
  sessionId: "abc123",
  message: "Crie um apartamento...",
  files: [image1.jpg, image2.jpg]
}
```

### 2. Backend (agents.routes.ts) - Processamento
```typescript
// Multer processa arquivos
router.post('/chat', upload.array('files', 10), async (req, res) => {
  const files = (req as any).files || [];
  
  // Para cada arquivo:
  for (const file of files) {
    // 1. Validar mimetype (image/*)
    if (!file.mimetype.startsWith('image/')) {
      rejectedFiles.push({ name, reason: '...' });
      continue;
    }
    
    // 2. Upload via cloudUploadService
    const result = await cloudUploadService.uploadFile(agencyId, file, 'properties');
    uploadedImageUrls.push(result.publicUrl);
  }
  
  // 3. Passar para agentsService
  await agentsService.chat({
    sessionId,
    message,
    uploadedImageUrls, // URLs das imagens
    rejectedFiles      // Arquivos inválidos
  }, user);
});
```

### 3. Backend (agents.service.ts) - Contexto
```typescript
async chat(dto: ChatMessageDto, user) {
  // 1. Injetar imagens no contexto da sessão
  if (dto.uploadedImageUrls) {
    session.context.attachedImages = dto.uploadedImageUrls;
  }
  
  // 2. Prompt do sistema inclui as URLs
  getSystemPrompt(agentType, session) {
    // Se há imagens anexadas:
    // "O usuário anexou 2 imagem(ns):
    //  1. https://cloudinary.com/...
    //  2. https://cloudinary.com/...
    //  INCLUA estas URLs no campo 'photos' da ferramenta."
  }
  
  // 3. Adicionar aviso sobre rejeitados
  if (dto.rejectedFiles) {
    session.messages.push({
      role: 'assistant',
      content: buildRejectedFilesWarning(rejectedFiles)
    });
  }
}
```

### 4. Backend (create-property.tool.ts) - Execução
```typescript
export async function createPropertyTool(user, data) {
  // 1. Parse JSON (agente envia dados estruturados)
  const parsedData = JSON.parse(data);
  
  // 2. Validar com Zod
  const validation = CreatePropertyArgsSchema.safeParse(parsedData);
  
  // 3. Criar DTO (incluindo photos: string[])
  const createPropertyDto = {
    ...validatedArgs,
    agency: user.agencyId,
    photos: validatedArgs.photos || [] // URLs das imagens
  };
  
  // 4. Chamar propertiesService.create()
  const property = await propertiesService.create(createPropertyDto, user);
  
  // 5. Retornar resposta formatada
  return `✅ Imóvel criado!
  - ID: ${property._id}
  - 📸 ${property.photos.length} foto(s) anexada(s)`;
}
```

## Validações Implementadas

### ✅ Tipo de Arquivo
- **Aceito:** `mimetype.startsWith('image/')`
- **Rejeitado:** PDFs, documentos, vídeos
- **Mensagem:** "Apenas imagens são aceitas para anexo em imóveis"

### ✅ RBAC
- Usuario precisa ter `agencyId`
- `propertiesService.create()` valida permissões (Manager/Admin)

### ✅ Tamanho
- **Limite:** 10MB por arquivo (Multer config)
- **Máximo:** 10 arquivos por request

### ✅ Provider de Upload
- Usa `cloudUploadService.uploadFile()` (suporta Cloudinary/S3)
- Respeita configuração da agência (`IntegrationSettings`)

## Testes Manuais

### Teste 1: Criar imóvel com imagens
```bash
# Frontend
1. Abrir AgentConversationalPage
2. Anexar 2 imagens (JPG)
3. Digitar: "Crie um apartamento 3 quartos em Guarapari, venda, R$ 500.000, 100m², Rua X, 123, Centro, Guarapari, ES, 29200000"
4. Enviar

# Resultado Esperado:
- Agente responde: "✅ Pronto! Cadastrei o imóvel..."
- Imóvel criado com 2 fotos no array `photos`
- Fotos visíveis no marketplace
```

### Teste 2: Arquivo rejeitado (PDF)
```bash
# Frontend
1. Anexar 1 PDF + 1 JPG
2. Digitar: "Crie um imóvel..."
3. Enviar

# Resultado Esperado:
- Agente cria o imóvel com 1 foto (JPG)
- Agente adiciona mensagem de aviso:
  "⚠️ O arquivo 'documento.pdf' não pôde ser anexado.
   Motivo: Apenas imagens são aceitas..."
```

### Teste 3: Sem imagens
```bash
# Frontend
1. NÃO anexar imagens
2. Digitar: "Crie um imóvel..."
3. Enviar

# Resultado Esperado:
- Agente cria o imóvel normalmente
- Campo `photos` = []
```

### Teste 4: RBAC (Agent tentando criar)
```bash
# Login como Agent (não Manager)
1. Anexar imagem
2. Tentar criar imóvel

# Resultado Esperado:
- Agente retorna erro: "❌ Erro de permissão: Você precisa ser Manager ou Admin..."
```

## Checklist de Validação

- [x] `create-property.tool.ts` criado e seguindo padrão
- [x] Ferramenta exportada em `index.ts`
- [x] `agents.routes.ts` aceita `multipart/form-data`
- [x] Multer configurado (10MB, 10 files)
- [x] Validação de mimetype (image/*)
- [x] Upload via `cloudUploadService`
- [x] `ChatMessageDto` atualizado com novos campos
- [x] `agents.service.ts` injeta imagens no contexto
- [x] `getSystemPrompt()` aceita session e inclui URLs
- [x] Mensagem de aviso para arquivos rejeitados
- [x] RBAC mantido (user passado para ferramenta)
- [x] Sem erros de TypeScript nos arquivos modificados

## Logs para Debugging

### Console Backend (agents.routes.ts)
```
[AgentsRouter] Processando 2 arquivo(s) anexado(s)
[AgentsRouter] Imagem enviada com sucesso: foto1.jpg -> https://cloudinary.com/...
[AgentsRouter] Imagem enviada com sucesso: foto2.jpg -> https://cloudinary.com/...
```

### Console Backend (agents.service.ts)
```
[AgentsService] 2 imagem(ns) anexada(s) ao contexto da sessão abc123
[AGENT CHAT] 🚀 Iniciando execução síncrona...
[AGENT CHAT] ✅ Execução síncrona concluída
```

### Console Backend (create-property.tool.ts)
```
[CreatePropertyTool] Ferramenta chamada pelo agente
[CreatePropertyTool] Imóvel criado: 6741234567890abcdef (ID)
```

## Próximos Passos (Se necessário)

### Frontend (smart-broker-frontend)
1. **Atualizar `AgentInput.tsx`** para aceitar anexos de arquivo
2. **Adicionar botão de anexo** (clip icon)
3. **Preview de imagens** antes do envio
4. **Enviar FormData** ao invés de JSON no `useMutation`

### Melhorias Futuras
- [ ] Compressão de imagens antes do upload (frontend)
- [ ] Progress bar de upload
- [ ] Suporte a drag-and-drop
- [ ] Limite de tamanho por agência (Settings)

## Notas Importantes

⚠️ **Não quebra funcionalidades existentes:**
- Endpoint `/agents/chat` continua aceitando JSON (sem arquivos)
- Multipart é opcional (backward compatible)
- Ferramentas antigas continuam funcionando

⚠️ **Estrutura do banco NÃO foi alterada:**
- Campo `photos: string[]` já existia em `Property`
- Apenas adicionamos as URLs ao array

⚠️ **RBAC mantido:**
- Todas as ferramentas passam `user` para os serviços
- `propertiesService.create()` valida permissões
