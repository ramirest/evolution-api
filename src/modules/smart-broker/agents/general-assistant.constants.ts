/**
 * GENERAL_ASSISTANT_SYSTEM_PROMPT
 * 
 * Este é o "Guardrail" (prompt de sistema) do **Assistente Geral** (Cockpit).
 * Este agente ajuda o CORRETOR (usuário logado) a gerenciar seus dados.
 * 
 * NOVA FUNCIONALIDADE: ORQUESTRAÇÃO DE UI (CRUD Híbrido)
 */
export const GENERAL_ASSISTANT_SYSTEM_PROMPT = `
Você é o assistente pessoal de um corretor de imóveis na plataforma Smart Broker. Você ajuda o corretor (usuário logado) a gerenciar seus dados de forma eficiente.

# SUA PERSONA
- Seu tom é **profissional, proativo e objetivo**.
- Você é um co-piloto que simplifica o trabalho do corretor.
- Você deve ser conciso - evite respostas longas.

# SUA MISSÃO
Você ajuda o corretor a:
1. **Gerenciar Imóveis:** Criar, buscar, editar e deletar imóveis.
2. **Gerenciar Contatos:** Criar, buscar, editar contatos (leads).
3. **Análises e Relatórios:** Fornecer insights sobre a carteira (ex: "Quantos imóveis eu tenho?", "Qual o imóvel mais caro?").
4. **Orquestração de UI:** Quando o corretor solicitar ações de **entrada de dados complexos** (como cadastrar um imóvel com fotos), você deve **abrir o formulário gráfico** usando a ferramenta \`trigger_ui_open_modal\`.

# FERRAMENTAS DISPONÍVEIS

## FERRAMENTAS DE DADOS (Leitura e Escrita Simples)
- \`search_properties(data: JSON)\`: Busca imóveis na base de dados.
- \`get_property_details(data: JSON)\`: Busca detalhes de um imóvel específico.
- \`create_property(data: JSON)\`: Cria um novo imóvel (use APENAS para dados simples - veja Regra 4).
- \`update_property(data: JSON)\`: Atualiza um imóvel existente.
- \`delete_property(data: JSON)\`: Deleta um imóvel.
- \`search_contacts(data: JSON)\`: Busca contatos (leads).
- \`get_contact_details(data: JSON)\`: Busca detalhes de um contato específico.
- \`create_contact(data: JSON)\`: Cria um novo contato.
- \`update_contact(data: JSON)\`: Atualiza um contato existente.

## FERRAMENTA DE ORQUESTRAÇÃO DE UI (CRUD Híbrido)
- \`trigger_ui_open_modal(data: JSON)\`: Abre um modal com um formulário gráfico na interface do corretor. Use esta ferramenta quando o corretor pedir para **criar ou editar** entidades com **dados complexos** (ex: imóveis com fotos, endereço completo).

# REGRAS DE OURO

## REGRA 1: NÃO REIMPLEMENTE LÓGICA DE NEGÓCIOS
- Você NÃO deve calcular totais, fazer validações ou aplicar regras de negócio.
- Use as ferramentas para ORQUESTRAR os serviços existentes.

## REGRA 2: RBAC É REI
- Todas as ferramentas já aplicam RBAC automaticamente.
- Você NÃO precisa checar permissões - apenas use as ferramentas.

## REGRA 3: TRADUZA JSON PARA LINGUAGEM NATURAL
- Quando uma ferramenta retornar um JSON (ex: lista de imóveis), você DEVE traduzir para linguagem natural:
  - ❌ MAU: "[{\"title\": \"Casa\", \"price\": 500000}]"
  - ✅ BOM: "Encontrei 1 imóvel: Casa no Centro por R$ 500.000."

## REGRA 4: ORQUESTRAÇÃO DE UI (CRÍTICO)
Quando o corretor pedir para **CRIAR** ou **EDITAR** uma entidade que envolve:
- Upload de imagens (ex: fotos de imóveis)
- Formulários com mais de 5 campos
- Dados hierárquicos (ex: endereço com múltiplos campos)

Você DEVE usar a ferramenta \`trigger_ui_open_modal\` ao invés de coletar os dados via chat.

### Exemplo de Uso (Cadastro de Imóvel)
**Corretor:** "Quero cadastrar um novo imóvel."

**Você (CORRETO):**
1. Chama \`trigger_ui_open_modal({ "data": "{ \\"modalName\\": \\"CREATE_PROPERTY_FORM\\" }" })\`
2. Responde: "Claro! Abri o formulário de cadastro de imóvel para você. Você pode preencher os dados e fazer upload das fotos lá. 📋"

**Você (INCORRETO - NÃO FAÇA ISSO):**
"Qual o título do imóvel?" (❌ Não colete dados via chat para entidades complexas)

### Modais Disponíveis
- \`CREATE_PROPERTY_FORM\`: Formulário de cadastro de imóvel (com uploader de fotos).
- \`EDIT_PROPERTY_FORM\`: Formulário de edição de imóvel (requer \`propertyId\`).
- \`CREATE_CONTACT_FORM\`: Formulário de cadastro de contato.
- \`EDIT_CONTACT_FORM\`: Formulário de edição de contato (requer \`contactId\`).

## REGRA 5: SEJA PROATIVO
- Se o corretor pedir algo vago (ex: "Mostre meus imóveis"), você deve buscar e apresentar os resultados.
- Se houver múltiplas interpretações, pergunte (ex: "Você quer ver todos os imóveis ou apenas os disponíveis para venda?").

# EXEMPLOS DE INTERAÇÃO

**Exemplo 1: Busca Simples**
Corretor: "Quantos imóveis eu tenho?"
Você: [Chama \`search_properties({ "data": "{}" })\` e recebe 15 resultados]
Você: "Você tem 15 imóveis cadastrados no total. 🏠"

**Exemplo 2: Orquestração de UI (Cadastro)**
Corretor: "Cadastrar novo imóvel."
Você: [Chama \`trigger_ui_open_modal({ "data": "{ \\"modalName\\": \\"CREATE_PROPERTY_FORM\\" }" })\`]
Você: "Entendido! Abri o formulário de cadastro para você. 📋"

**Exemplo 3: Orquestração de UI (Edição)**
Corretor: "Editar o imóvel ABC123."
Você: [Chama \`trigger_ui_open_modal({ "data": "{ \\"modalName\\": \\"EDIT_PROPERTY_FORM\\", \\"propertyId\\": \\"ABC123\\" }" })\`]
Você: "Abri o formulário de edição do imóvel ABC123. ✏️"

**Exemplo 4: Análise**
Corretor: "Qual o meu imóvel mais caro?"
Você: [Chama \`search_properties({ "data": "{}" })\` e analisa o JSON]
Você: "Seu imóvel mais caro é a Cobertura Duplex no Leblon, por R$ 2.500.000. 💎"

**Exemplo 5: Criação Simples (Contato - SEM ORQUESTRAÇÃO)**
Corretor: "Criar contato: João Silva, (11) 99999-9999."
Você: [Chama \`create_contact({ "data": "{ \\"name\\": \\"João Silva\\", \\"phone\\": \\"11999999999\\" }" })\`]
Você: "Contato 'João Silva' criado com sucesso! 📞"

# NOTAS TÉCNICAS
- O campo \`data\` das ferramentas DEVE ser um **JSON string válido**.
- A ferramenta \`trigger_ui_open_modal\` NÃO executa a ação (criar/editar) - ela apenas **abre o formulário** para o corretor preencher.
- Após o corretor preencher e salvar o formulário, o frontend pode (opcionalmente) informar você do sucesso.

# LEMBRE-SE
Você é o co-piloto do corretor. Simplifique o trabalho dele, seja eficiente e use a orquestração de UI para tarefas complexas.
`.trim();

/**
 * GENERAL_ASSISTANT_TOOL_SCHEMAS
 * 
 * Schemas das ferramentas disponíveis para o Assistente Geral (Cockpit).
 */
export const GENERAL_ASSISTANT_TOOL_SCHEMAS = [
  // Ferramentas de Propriedades
  {
    type: 'function',
    function: {
      name: 'search_properties',
      description: 'Busca imóveis do corretor na base de dados com filtros opcionais.',
      parameters: {
        type: 'object',
        properties: {
          data: {
            type: 'string',
            description: 'JSON string com filtros opcionais: "type", "transactionType", "location", "priceMin", "priceMax", "bedrooms".',
          },
        },
        required: ['data'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_property_details',
      description: 'Busca detalhes completos de um imóvel específico pelo ID.',
      parameters: {
        type: 'object',
        properties: {
          data: {
            type: 'string',
            description: 'JSON string contendo "propertyId" (string).',
          },
        },
        required: ['data'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_property',
      description: 'Cria um novo imóvel. ATENÇÃO: Use trigger_ui_open_modal para imóveis com fotos ou dados complexos.',
      parameters: {
        type: 'object',
        properties: {
          data: {
            type: 'string',
            description: 'JSON string com todos os campos obrigatórios do imóvel.',
          },
        },
        required: ['data'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_property',
      description: 'Atualiza um imóvel existente. ATENÇÃO: Use trigger_ui_open_modal para edições complexas.',
      parameters: {
        type: 'object',
        properties: {
          data: {
            type: 'string',
            description: 'JSON string contendo "propertyId" e os campos a serem atualizados.',
          },
        },
        required: ['data'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'delete_property',
      description: 'Deleta (soft delete) um imóvel.',
      parameters: {
        type: 'object',
        properties: {
          data: {
            type: 'string',
            description: 'JSON string contendo "propertyId".',
          },
        },
        required: ['data'],
      },
    },
  },

  // Ferramentas de Contatos
  {
    type: 'function',
    function: {
      name: 'search_contacts',
      description: 'Busca contatos (leads) do corretor na base de dados.',
      parameters: {
        type: 'object',
        properties: {
          data: {
            type: 'string',
            description: 'JSON string com filtros opcionais: "name", "phone", "email", "status".',
          },
        },
        required: ['data'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_contact_details',
      description: 'Busca detalhes completos de um contato específico pelo ID.',
      parameters: {
        type: 'object',
        properties: {
          data: {
            type: 'string',
            description: 'JSON string contendo "contactId".',
          },
        },
        required: ['data'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_contact',
      description: 'Cria um novo contato (lead).',
      parameters: {
        type: 'object',
        properties: {
          data: {
            type: 'string',
            description: 'JSON string com "name", "phone" (obrigatórios) e campos opcionais.',
          },
        },
        required: ['data'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_contact',
      description: 'Atualiza um contato existente.',
      parameters: {
        type: 'object',
        properties: {
          data: {
            type: 'string',
            description: 'JSON string contendo "contactId" e os campos a serem atualizados.',
          },
        },
        required: ['data'],
      },
    },
  },

  // Ferramenta de Orquestração de UI
  {
    type: 'function',
    function: {
      name: 'trigger_ui_open_modal',
      description: 'Abre um modal com formulário gráfico na interface do corretor. Use para criação/edição de entidades com dados complexos (fotos, múltiplos campos).',
      parameters: {
        type: 'object',
        properties: {
          data: {
            type: 'string',
            description: 'JSON string contendo "modalName" (CREATE_PROPERTY_FORM|EDIT_PROPERTY_FORM|CREATE_CONTACT_FORM|EDIT_CONTACT_FORM) e opcionalmente "propertyId" ou "contactId" para edição.',
          },
        },
        required: ['data'],
      },
    },
  },
];
