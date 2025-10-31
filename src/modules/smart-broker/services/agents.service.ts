import { Types } from 'mongoose';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { AgentSessionModel, IAgentSession, SessionStatus, AgentStatus } from '../models/agent-session.model';
import { BadRequestException, NotFoundException, ForbiddenException } from '../../../exceptions';
import { AuthenticatedUser } from '../types/auth.types';
import { Logger } from '../../../config/logger.config';
import { propertiesService } from './properties.service';
import { contactsService } from './contacts.service';
import { evolutionBridgeService } from './evolution-bridge.service';

const logger = new Logger('AgentsService');

export enum AgentType {
  GENERAL_ASSISTANT = 'general_assistant',
  LEAD_QUALIFIER = 'lead_qualifier',
  PROPERTY_ADVISOR = 'property_advisor',
}

export interface ExecuteGoalDto {
  goal: string;
  agentType: AgentType;
  context?: Record<string, any>;
  sessionId?: string;
}

export interface ChatMessageDto {
  sessionId: string;
  message: string;
  contactId?: string;
}

interface Tool {
  name: string;
  description: string;
  parameters?: any;
  execute: (input: any, user: AuthenticatedUser) => Promise<string>;
}

/**
 * AgentsService - Orquestração de IA
 * 
 * Este é o "CÉREBRO" da aplicação agêntica.
 * NÃO reimplenta lógica de negócios - ORQUESTRA os serviços existentes.
 * 
 * Ciclo: Observe → Think → Act
 */
export class AgentsService {
  private openaiCache: Map<string, OpenAI> = new Map();
  private geminiCache: Map<string, GoogleGenerativeAI> = new Map();

  /**
   * Obtém configurações de IA da agência
   * TODO: Integrar com SettingsService quando disponível
   */
  private async getAiConfig(agencyId: string): Promise<{ 
    enabled: boolean; 
    provider: 'openai' | 'google'; 
    apiKey?: string; 
    model?: string; 
  }> {
    // Por enquanto, usar variáveis de ambiente como fallback
    const provider = (process.env.AI_PROVIDER as any) || 'openai';
    const apiKey = provider === 'google' 
      ? process.env.GEMINI_API_KEY 
      : process.env.OPENAI_API_KEY;

    return {
      enabled: !!apiKey,
      provider,
      apiKey,
      model: provider === 'google' ? 'gemini-2.0-flash-exp' : 'gpt-4o-mini',
    };
  }

  /**
   * Criar ou recuperar instância OpenAI
   */
  private async getOpenAIInstance(agencyId: string): Promise<OpenAI | null> {
    const aiConfig = await this.getAiConfig(agencyId);

    if (!aiConfig.enabled || !aiConfig.apiKey || aiConfig.provider !== 'openai') {
      return null;
    }

    const cacheKey = `${agencyId}_${aiConfig.apiKey.substring(0, 10)}`;
    
    if (!this.openaiCache.has(cacheKey)) {
      this.openaiCache.set(cacheKey, new OpenAI({ apiKey: aiConfig.apiKey }));
    }

    return this.openaiCache.get(cacheKey)!;
  }

  /**
   * Criar ou recuperar instância Gemini
   */
  private async getGeminiInstance(agencyId: string): Promise<GoogleGenerativeAI | null> {
    const aiConfig = await this.getAiConfig(agencyId);

    if (!aiConfig.enabled || !aiConfig.apiKey || aiConfig.provider !== 'google') {
      return null;
    }

    const cacheKey = `${agencyId}_${aiConfig.apiKey.substring(0, 10)}`;
    
    if (!this.geminiCache.has(cacheKey)) {
      this.geminiCache.set(cacheKey, new GoogleGenerativeAI(aiConfig.apiKey));
    }

    return this.geminiCache.get(cacheKey)!;
  }

  /**
   * Executar objetivo do agente
   */
  async executeGoal(dto: ExecuteGoalDto, user: AuthenticatedUser): Promise<IAgentSession> {
    if (!user.agencyId) {
      throw new ForbiddenException('Usuário não possui agência associada');
    }

    logger.info(`[AGENT] Executando objetivo: ${dto.goal} (tipo: ${dto.agentType})`);

    // Criar nova sessão
    const session = new AgentSessionModel({
      userId: user.userId,
      agencyId: user.agencyId,
      agentType: dto.agentType,
      status: SessionStatus.ACTIVE,
      agentStatus: AgentStatus.IDLE,
      title: dto.goal.substring(0, 100), // Usar goal como título
      context: { ...dto.context, originalGoal: dto.goal },
      messages: [
        {
          role: 'user',
          content: dto.goal,
          timestamp: new Date(),
        },
      ],
      messageCount: 1,
      lastMessageAt: new Date(),
    });

    const savedSession = await session.save();

    // Executar em background
    setImmediate(() => {
      this.executeAsync(savedSession._id.toString(), user).catch((error) => {
        logger.error(`[AGENT] Erro na execução assíncrona: ${error.message}`);
      });
    });

    return savedSession;
  }

  /**
   * Execução assíncrona do agente
   */
  private async executeAsync(sessionId: string, user: AuthenticatedUser): Promise<void> {
    try {
      const session = await AgentSessionModel.findById(sessionId);
      
      if (!session) {
        throw new NotFoundException('Sessão não encontrada');
      }

      // Atualizar status
      session.agentStatus = AgentStatus.THINKING;
      await session.save();

      // Verificar configuração de IA
      const aiConfig = await this.getAiConfig(user.agencyId!);

      if (!aiConfig.enabled) {
        logger.warn('[AGENT] IA não configurada. Executando modo stub.');
        await this.executeStubMode(sessionId);
        return;
      }

      // Executar com provedor configurado
      if (aiConfig.provider === 'google') {
        await this.executeWithGemini(sessionId, user);
      } else {
        await this.executeWithOpenAI(sessionId, user);
      }

    } catch (error) {
      logger.error(`[AGENT] Erro na execução: ${error.message}`);
      
      await AgentSessionModel.findByIdAndUpdate(sessionId, {
        agentStatus: AgentStatus.IDLE,
        lastError: error.message,
      });
    }
  }

  /**
   * Modo stub (sem IA configurada)
   */
  private async executeStubMode(sessionId: string): Promise<void> {
    const session = await AgentSessionModel.findById(sessionId);
    
    if (!session) return;

    const goal = session.context?.originalGoal || 'Objetivo não especificado';
    const stubResponse = `📋 Objetivo registrado: ${goal}\n\n⚠️  **Modo de Demonstração Ativo**\n\nPara ativar a IA real, configure:\n- OPENAI_API_KEY ou GEMINI_API_KEY no .env\n- AI_PROVIDER=openai ou AI_PROVIDER=google`;

    session.messages.push({
      role: 'assistant',
      content: stubResponse,
      timestamp: new Date(),
    });

    session.agentStatus = AgentStatus.IDLE;
    session.status = SessionStatus.COMPLETED;
    session.messageCount = session.messages.length;
    session.lastMessageAt = new Date();
    
    await session.save();

    logger.info(`[AGENT] Sessão ${sessionId} concluída (modo stub)`);
  }

  /**
   * Executar com OpenAI
   */
  private async executeWithOpenAI(sessionId: string, user: AuthenticatedUser): Promise<void> {
    const session = await AgentSessionModel.findById(sessionId);
    
    if (!session) return;

    const openai = await this.getOpenAIInstance(user.agencyId!);
    
    if (!openai) {
      await this.executeStubMode(sessionId);
      return;
    }

    const aiConfig = await this.getAiConfig(user.agencyId!);
    const tools = this.getToolsForAgent(user);

    try {
      // Preparar mensagens
      const messages: any[] = [
        {
          role: 'system',
          content: this.getSystemPrompt(session.agentType),
        },
        ...session.messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
      ];

      // Chamar OpenAI com function calling
      const response = await openai.chat.completions.create({
        model: aiConfig.model || 'gpt-4o-mini',
        messages,
        tools: tools.map((tool) => ({
          type: 'function',
          function: {
            name: tool.name,
            description: tool.description,
            parameters: tool.parameters || {
              type: 'object',
              properties: {},
            },
          },
        })),
        tool_choice: 'auto',
      });

      const assistantMessage = response.choices[0].message;

      // Se o modelo quer chamar uma função
      if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
        session.agentStatus = AgentStatus.EXECUTING;
        await session.save();

        for (const toolCall of assistantMessage.tool_calls) {
          if (toolCall.type !== 'function') continue;
          
          const tool = tools.find((t) => t.name === toolCall.function.name);
          
          if (tool) {
            logger.info(`[AGENT] Executando ferramenta: ${tool.name}`);
            
            const args = JSON.parse(toolCall.function.arguments);
            const result = await tool.execute(args, user);

            // Adicionar resultado ao histórico
            session.messages.push({
              role: 'assistant',
              content: `[Ferramenta: ${tool.name}] ${result}`,
              timestamp: new Date(),
              metadata: { toolName: tool.name, args },
            });
          }
        }

        session.messageCount = session.messages.length;
        session.lastMessageAt = new Date();
        await session.save();

        // Chamar novamente o modelo com os resultados das funções
        await this.executeWithOpenAI(sessionId, user);
        return;
      }

      // Resposta final do assistente
      if (assistantMessage.content) {
        session.messages.push({
          role: 'assistant',
          content: assistantMessage.content,
          timestamp: new Date(),
        });
      }

      session.agentStatus = AgentStatus.IDLE;
      session.messageCount = session.messages.length;
      session.lastMessageAt = new Date();
      await session.save();

    } catch (error) {
      logger.error(`[AGENT] Erro ao executar com OpenAI: ${error.message}`);
      throw error;
    }
  }

  /**
   * Executar com Google Gemini
   */
  private async executeWithGemini(sessionId: string, user: AuthenticatedUser): Promise<void> {
    const session = await AgentSessionModel.findById(sessionId);
    
    if (!session) return;

    const gemini = await this.getGeminiInstance(user.agencyId!);
    
    if (!gemini) {
      await this.executeStubMode(sessionId);
      return;
    }

    const aiConfig = await this.getAiConfig(user.agencyId!);
    const tools = this.getToolsForAgent(user);

    try {
      // Preparar ferramentas no formato Gemini
      const geminiTools = tools.length > 0 ? [{
        functionDeclarations: tools.map((tool) => ({
          name: tool.name,
          description: tool.description,
          parameters: tool.parameters || {
            type: 'object',
            properties: {},
          },
        })),
      }] : undefined;

      const model = gemini.getGenerativeModel({
        model: aiConfig.model || 'gemini-2.0-flash-exp',
        systemInstruction: this.getSystemPrompt(session.agentType),
        tools: geminiTools,
      });

      // Iniciar chat
      const chat = model.startChat({
        history: session.messages
          .filter((msg) => msg.role !== 'system')
          .map((msg) => ({
            role: msg.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: msg.content }],
          })),
      });

      const goal = session.context?.originalGoal || 'Continue a conversa';
      const result = await chat.sendMessage(goal);
      const response = result.response;

      // Verificar se há chamadas de função
      const functionCalls = response.functionCalls();

      if (functionCalls && functionCalls.length > 0) {
        session.agentStatus = AgentStatus.EXECUTING;
        await session.save();

        for (const call of functionCalls) {
          const tool = tools.find((t) => t.name === call.name);
          
          if (tool) {
            logger.info(`[AGENT] Executando ferramenta: ${tool.name}`);
            
            const result = await tool.execute(call.args, user);

            session.messages.push({
              role: 'assistant',
              content: `[Ferramenta: ${tool.name}] ${result}`,
              timestamp: new Date(),
              metadata: { toolName: tool.name, args: call.args },
            });
          }
        }

        session.messageCount = session.messages.length;
        session.lastMessageAt = new Date();
        await session.save();

        // Chamar novamente com resultados
        await this.executeWithGemini(sessionId, user);
        return;
      }

      // Resposta final
      const text = response.text();
      
      if (text) {
        session.messages.push({
          role: 'assistant',
          content: text,
          timestamp: new Date(),
        });
      }

      session.agentStatus = AgentStatus.IDLE;
      session.messageCount = session.messages.length;
      session.lastMessageAt = new Date();
      await session.save();

    } catch (error) {
      logger.error(`[AGENT] Erro ao executar com Gemini: ${error.message}`);
      throw error;
    }
  }

  /**
   * Obter ferramentas disponíveis para o agente
   */
  private getToolsForAgent(user: AuthenticatedUser): Tool[] {
    return [
      this.createSearchPropertiesTool(user),
      this.createGetPropertyDetailsTool(user),
      this.createSearchContactsTool(user),
      this.createSendWhatsappMessageTool(user),
    ];
  }

  /**
   * Tool: Buscar imóveis
   */
  private createSearchPropertiesTool(user: AuthenticatedUser): Tool {
    return {
      name: 'search_properties',
      description: 'Busca imóveis no sistema com filtros. Respeita RBAC do usuário.',
      parameters: {
        type: 'object',
        properties: {
          type: { type: 'string', description: 'Tipo do imóvel (house, apartment, commercial)' },
          minPrice: { type: 'number', description: 'Preço mínimo' },
          maxPrice: { type: 'number', description: 'Preço máximo' },
          bedrooms: { type: 'number', description: 'Número de quartos' },
          city: { type: 'string', description: 'Cidade' },
        },
      },
      execute: async (input: any, execUser: AuthenticatedUser) => {
        try {
          const filters: any = { ...input, agency: execUser.agencyId };
          const properties = await propertiesService.findAll(execUser, filters);

          return JSON.stringify({
            success: true,
            count: properties.length,
            properties: properties.slice(0, 5).map((p) => ({
              id: p._id,
              title: p.title,
              type: p.type,
              price: p.price,
              bedrooms: p.features?.bedrooms,
              city: p.address?.city,
            })),
          });
        } catch (error) {
          return JSON.stringify({ success: false, error: error.message });
        }
      },
    };
  }

  /**
   * Tool: Obter detalhes de imóvel
   */
  private createGetPropertyDetailsTool(user: AuthenticatedUser): Tool {
    return {
      name: 'get_property_details',
      description: 'Obtém detalhes completos de um imóvel por ID',
      parameters: {
        type: 'object',
        properties: {
          propertyId: { type: 'string', description: 'ID do imóvel' },
        },
        required: ['propertyId'],
      },
      execute: async (input: any, execUser: AuthenticatedUser) => {
        try {
          if (!input.propertyId) {
            return JSON.stringify({ success: false, error: 'propertyId é obrigatório' });
          }

          const property = await propertiesService.findOne(input.propertyId, execUser);

          return JSON.stringify({
            success: true,
            property: {
              id: property._id,
              title: property.title,
              description: property.description,
              type: property.type,
              price: property.price,
              features: property.features,
              address: property.address,
            },
          });
        } catch (error) {
          return JSON.stringify({ success: false, error: error.message });
        }
      },
    };
  }

  /**
   * Tool: Buscar contatos
   */
  private createSearchContactsTool(user: AuthenticatedUser): Tool {
    return {
      name: 'search_contacts',
      description: 'Busca contatos/leads no CRM com filtros',
      parameters: {
        type: 'object',
        properties: {
          status: { type: 'string', description: 'Status do contato (new, qualified, negotiating)' },
          name: { type: 'string', description: 'Nome do contato' },
          phone: { type: 'string', description: 'Telefone do contato' },
        },
      },
      execute: async (input: any, execUser: AuthenticatedUser) => {
        try {
          const contacts = await contactsService.findAll(execUser, input);

          return JSON.stringify({
            success: true,
            count: contacts.length,
            contacts: contacts.slice(0, 5).map((c) => ({
              id: c._id,
              name: c.name,
              phone: c.phone,
              status: c.status,
              email: c.email,
            })),
          });
        } catch (error) {
          return JSON.stringify({ success: false, error: error.message });
        }
      },
    };
  }

  /**
   * Tool: Enviar mensagem WhatsApp
   */
  private createSendWhatsappMessageTool(user: AuthenticatedUser): Tool {
    return {
      name: 'send_whatsapp_message',
      description: 'Envia mensagem via WhatsApp para um contato',
      parameters: {
        type: 'object',
        properties: {
          phone: { type: 'string', description: 'Número de telefone (com código do país)' },
          message: { type: 'string', description: 'Mensagem a ser enviada' },
        },
        required: ['phone', 'message'],
      },
      execute: async (input: any, execUser: AuthenticatedUser) => {
        try {
          if (!input.phone || !input.message) {
            return JSON.stringify({ success: false, error: 'phone e message são obrigatórios' });
          }

          // TODO: Obter instanceId das configurações da agência
          const instanceId = 'default'; // Placeholder

          await evolutionBridgeService.sendTextMessage(instanceId, {
            number: input.phone,
            text: input.message,
          });

          return JSON.stringify({
            success: true,
            message: 'Mensagem enviada com sucesso',
          });
        } catch (error) {
          return JSON.stringify({ success: false, error: error.message });
        }
      },
    };
  }

  /**
   * Obter prompt do sistema baseado no tipo de agente
   */
  private getSystemPrompt(agentType: string): string {
    const prompts: Record<string, string> = {
      [AgentType.GENERAL_ASSISTANT]: `Você é um assistente de vendas imobiliário inteligente. Você ajuda corretores a:
- Buscar imóveis no sistema
- Qualificar leads e contatos
- Enviar mensagens via WhatsApp
- Gerenciar informações de clientes

Seja profissional, objetivo e sempre confirme antes de executar ações importantes.`,

      [AgentType.LEAD_QUALIFIER]: `Você é um assistente especializado em qualificação de leads imobiliários. Sua função é:
- Fazer perguntas estratégicas para entender as necessidades do cliente
- Coletar informações: orçamento, localização preferida, número de quartos, tipo de imóvel
- Buscar imóveis compatíveis no sistema
- Atualizar o status do lead para "qualified" quando coletar todas as informações

Seja cordial e faça uma pergunta por vez.`,

      [AgentType.PROPERTY_ADVISOR]: `Você é um consultor imobiliário especializado. Você ajuda a:
- Analisar características de imóveis
- Comparar opções disponíveis
- Sugerir imóveis baseado nas preferências do cliente
- Fornecer informações detalhadas sobre localização, infraestrutura e investimento

Seja consultivo e forneça insights de valor.`,
    };

    return prompts[agentType] || prompts[AgentType.GENERAL_ASSISTANT];
  }

  /**
   * Buscar sessão por ID (com RBAC)
   */
  async findSession(sessionId: string, user: AuthenticatedUser): Promise<IAgentSession> {
    if (!Types.ObjectId.isValid(sessionId)) {
      throw new BadRequestException('ID inválido');
    }

    const session = await AgentSessionModel.findById(sessionId).exec();

    if (!session) {
      throw new NotFoundException('Sessão não encontrada');
    }

    // RBAC: Verificar se usuário pode ver esta sessão
    if (session.userId.toString() !== user.userId && session.agencyId.toString() !== user.agencyId) {
      throw new ForbiddenException('Você não tem permissão para visualizar esta sessão');
    }

    return session;
  }

  /**
   * Listar sessões do usuário
   */
  async findSessions(user: AuthenticatedUser, filters?: { status?: SessionStatus }): Promise<IAgentSession[]> {
    const query: any = {
      $or: [
        { userId: new Types.ObjectId(user.userId) },
        { agencyId: new Types.ObjectId(user.agencyId!) },
      ],
    };

    if (filters?.status) {
      query.status = filters.status;
    }

    const sessions = await AgentSessionModel.find(query).sort({ createdAt: -1 }).limit(50).exec();
    
    return sessions;
  }

  /**
   * Continuar conversa em uma sessão existente
   */
  async chat(dto: ChatMessageDto, user: AuthenticatedUser): Promise<IAgentSession> {
    const session = await this.findSession(dto.sessionId, user);

    // Adicionar mensagem do usuário ao histórico
    session.messages.push({
      role: 'user',
      content: dto.message,
      timestamp: new Date(),
    });

    session.agentStatus = AgentStatus.THINKING;
    session.messageCount = session.messages.length;
    session.lastMessageAt = new Date();
    await session.save();

    // Executar em background
    setImmediate(() => {
      this.executeAsync(session._id.toString(), user).catch((error) => {
        logger.error(`[AGENT] Erro ao processar chat: ${error.message}`);
      });
    });

    return session;
  }
}

export const agentsService = new AgentsService();
