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
import { settingsService } from './settings.service';

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
  uploadedImageUrls?: string[];
  rejectedFiles?: Array<{ name: string; reason: string }>;
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
   * Obtém configurações de IA da agência via SettingsService
   */
  private async getAiConfig(agencyId: string): Promise<{ 
    enabled: boolean; 
    provider: 'openai' | 'google' | 'anthropic'; 
    apiKey: string; 
    model: string; 
  }> {
    return await settingsService.getAiConfig(agencyId);
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
          content: this.getSystemPrompt(session.agentType, session),
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

        // ✅ CORREÇÃO: Adicionar a mensagem do assistente (com tool_calls) ao histórico
        // Isso é necessário para o OpenAI entender o contexto na próxima chamada
        session.messages.push({
          role: 'assistant',
          content: assistantMessage.content || '',
          timestamp: new Date(),
          metadata: { 
            tool_calls: assistantMessage.tool_calls.map((tc: any) => ({
              id: tc.id,
              type: tc.type,
              function: tc.function,
            }))
          },
        });

        // Array para armazenar resultados das ferramentas
        const toolResults: Array<{ tool_call_id: string; role: 'tool'; content: string }> = [];

        for (const toolCall of assistantMessage.tool_calls) {
          if (toolCall.type !== 'function') continue;
          
          const tool = tools.find((t) => t.name === toolCall.function.name);
          
          if (tool) {
            logger.info(`[AGENT] Executando ferramenta: ${tool.name}`);
            
            const args = JSON.parse(toolCall.function.arguments);
            const result = await tool.execute(args, user);

            // ✅ CORREÇÃO: Adicionar resultado como mensagem "tool" (não "assistant")
            // Isso permite que o OpenAI interprete o resultado e gere uma resposta humanizada
            session.messages.push({
              role: 'tool' as any, // MongoDB schema precisa aceitar 'tool'
              content: result,
              timestamp: new Date(),
              metadata: { 
                tool_call_id: toolCall.id,
                toolName: tool.name, 
                args 
              },
            });

            // Armazenar para enviar na próxima chamada do OpenAI
            toolResults.push({
              tool_call_id: toolCall.id,
              role: 'tool',
              content: result,
            });
            
            console.log(`[AGENT] 📝 Resultado da ferramenta "${tool.name}" adicionado ao histórico`);
            console.log(`[AGENT] 📊 Total de mensagens agora: ${session.messages.length}`);
          }
        }

        session.messageCount = session.messages.length;
        session.lastMessageAt = new Date();
        await session.save();
        
        console.log('[AGENT] 💾 Sessão salva após execução de ferramentas');

        // ✅ CORREÇÃO: Fazer segunda chamada ao OpenAI com os resultados das ferramentas
        // O OpenAI vai interpretar os resultados e gerar uma resposta humanizada
        try {
          const messages: any[] = [
            {
              role: 'system',
              content: this.getSystemPrompt(session.agentType, session),
            },
            ...session.messages
              .filter((msg: any) => msg.role !== 'tool') // Filtrar mensagens "tool" para usar toolResults
              .map((msg) => ({
                role: msg.role,
                content: msg.content,
                tool_calls: msg.metadata?.tool_calls,
              })),
            ...toolResults, // ✅ Adicionar resultados das ferramentas
          ];

          console.log('[AGENT] 🔄 Segunda chamada ao OpenAI para gerar resposta humanizada...');

          const secondResponse = await openai.chat.completions.create({
            model: aiConfig.model || 'gpt-4o-mini',
            messages,
          });

          const finalMessage = secondResponse.choices[0].message;

          if (finalMessage.content) {
            session.messages.push({
              role: 'assistant',
              content: finalMessage.content,
              timestamp: new Date(),
            });

            console.log('[AGENT] ✅ Resposta humanizada do assistente:', finalMessage.content.substring(0, 100));
          }

          session.agentStatus = AgentStatus.IDLE;
          session.messageCount = session.messages.length;
          session.lastMessageAt = new Date();
          await session.save();

          console.log('[AGENT] 💾 Sessão final salva com resposta humanizada!');
        } catch (error) {
          logger.error(`[AGENT] Erro na segunda chamada do OpenAI: ${error.message}`);
          // Se falhar, continuar com o resultado da ferramenta
          session.agentStatus = AgentStatus.IDLE;
          await session.save();
        }

        return;
      }

      // Resposta final do assistente
      if (assistantMessage.content) {
        session.messages.push({
          role: 'assistant',
          content: assistantMessage.content,
          timestamp: new Date(),
        });
        
        console.log('[AGENT] ✅ Resposta FINAL do assistente adicionada:', assistantMessage.content.substring(0, 100));
        console.log(`[AGENT] 📊 Total de mensagens na sessão: ${session.messages.length}`);
      }

      session.agentStatus = AgentStatus.IDLE;
      session.messageCount = session.messages.length;
      session.lastMessageAt = new Date();
      await session.save();
      
      console.log('[AGENT] 💾 Sessão FINAL salva com sucesso!');
      console.log('[AGENT] 🏁 Execução completa. Status: IDLE');

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
        systemInstruction: this.getSystemPrompt(session.agentType, session),
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
      this.createCreatePropertyTool(user), // ✅ FERRAMENTA REAL DE CRIAÇÃO
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
   * ✅ Tool: CRIAR IMÓVEL (Ferramenta Inovadora)
   * 
   * Esta ferramenta permite ao agente CRIAR imóveis diretamente a partir de prompts do usuário,
   * incluindo upload de imagens e geração de link público do marketplace.
   * 
   * INOVAÇÃO: Não abre modais. Executa a ação e retorna o resultado instantaneamente.
   */
  private createCreatePropertyTool(user: AuthenticatedUser): Tool {
    return {
      name: 'create_property',
      description: `Cria um novo imóvel no sistema com todos os detalhes fornecidos pelo usuário.
      
      Use esta ferramenta quando o usuário solicitar cadastro de imóvel com dados completos.
      A ferramenta aceita URLs de imagens (já hospedadas) ou retorna instruções para upload.
      
      IMPORTANTE: Após criar, retorne o link público do marketplace para o usuário compartilhar.`,
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Título do imóvel' },
          type: { 
            type: 'string', 
            enum: ['house', 'apartment', 'commercial', 'land', 'farm', 'penthouse', 'studio'],
            description: 'Tipo do imóvel' 
          },
          transactionType: {
            type: 'string',
            enum: ['sale', 'rent', 'both'],
            description: 'Tipo de transação (venda, aluguel ou ambos)'
          },
          description: { type: 'string', description: 'Descrição detalhada do imóvel' },
          price: { type: 'number', description: 'Preço de venda em reais' },
          rentPrice: { type: 'number', description: 'Preço de aluguel (opcional)' },
          area: { type: 'number', description: 'Área total em m²' },
          address: {
            type: 'object',
            properties: {
              street: { type: 'string' },
              number: { type: 'string' },
              neighborhood: { type: 'string' },
              city: { type: 'string' },
              state: { type: 'string' },
              zipCode: { type: 'string' },
            },
            required: ['street', 'neighborhood', 'city', 'state'],
          },
          features: {
            type: 'object',
            properties: {
              bedrooms: { type: 'number', description: 'Número de quartos' },
              bathrooms: { type: 'number', description: 'Número de banheiros' },
              suites: { type: 'number', description: 'Número de suítes' },
              parkingSpaces: { type: 'number', description: 'Vagas de garagem' },
              furnished: { type: 'boolean', description: 'Mobiliado' },
              pool: { type: 'boolean', description: 'Piscina' },
              gym: { type: 'boolean', description: 'Academia' },
              garden: { type: 'boolean', description: 'Jardim' },
              barbecue: { type: 'boolean', description: 'Churrasqueira' },
              elevator: { type: 'boolean', description: 'Elevador' },
            },
          },
          photos: {
            type: 'array',
            items: { type: 'string' },
            description: 'Array de URLs de imagens (já hospedadas no Cloudinary ou similar)',
          },
        },
        required: ['title', 'type', 'transactionType', 'description', 'price', 'area', 'address'],
      },
      execute: async (input: any, execUser: AuthenticatedUser) => {
        try {
          logger.info(`[AGENT TOOL] Criando imóvel: ${input.title}`);
          console.log('[AGENT TOOL] ✅ INÍCIO - Dados recebidos:', JSON.stringify(input, null, 2));

          // Preparar DTO para o PropertiesService
          const propertyData = {
            ...input,
            status: 'available',
            isActive: true,
            agency: execUser.agencyId,
            owner: execUser.userId,
            photos: input.photos || [],
            features: {
              bedrooms: input.features?.bedrooms || 0,
              bathrooms: input.features?.bathrooms || 0,
              suites: input.features?.suites || 0,
              parkingSpaces: input.features?.parkingSpaces || 0,
              furnished: input.features?.furnished || false,
              pool: input.features?.pool || false,
              gym: input.features?.gym || false,
              garden: input.features?.garden || false,
              barbecue: input.features?.barbecue || false,
              elevator: input.features?.elevator || false,
              airConditioning: input.features?.airConditioning || false,
              security: input.features?.security || false,
            },
            address: {
              ...input.address,
              country: input.address?.country || 'Brasil',
            },
            tags: input.tags || [],
            views: 0,
          };

          console.log('[AGENT TOOL] 🔄 Chamando PropertiesService.create...');

          // Chamar o PropertiesService (RBAC já aplicado)
          const createdProperty = await propertiesService.create(propertyData, execUser);

          console.log('[AGENT TOOL] ✅ Imóvel criado! ID:', createdProperty._id);

          // Gerar link público do marketplace
          const marketplaceUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/marketplace/property/${createdProperty._id}`;

          const successResponse = {
            success: true,
            message: 'Imóvel cadastrado com sucesso!',
            property: {
              id: createdProperty._id,
              title: createdProperty.title,
              type: createdProperty.type,
              price: createdProperty.price,
              address: `${createdProperty.address.street}, ${createdProperty.address.number} - ${createdProperty.address.neighborhood}, ${createdProperty.address.city}/${createdProperty.address.state}`,
              photosCount: createdProperty.photos.length,
              marketplaceUrl, // ✅ Link público
            },
          };

          console.log('[AGENT TOOL] 📤 Retornando para o LLM:', JSON.stringify(successResponse, null, 2));
          
          logger.info(`[AGENT TOOL] Imóvel criado com sucesso: ${createdProperty._id}`);

          return JSON.stringify(successResponse);
        } catch (error) {
          console.error('[AGENT TOOL] ❌ ERRO ao criar imóvel:', error.message);
          console.error('[AGENT TOOL] Stack:', error.stack);
          
          logger.error(`[AGENT TOOL] Erro ao criar imóvel: ${error.message}`);
          
          const errorResponse = { 
            success: false, 
            error: `Erro ao criar imóvel: ${error.message}` 
          };
          
          console.log('[AGENT TOOL] 📤 Retornando ERRO para o LLM:', JSON.stringify(errorResponse));
          
          return JSON.stringify(errorResponse);
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
  private getSystemPrompt(agentType: string, session?: IAgentSession): string {
    const prompts: Record<string, string> = {
      [AgentType.GENERAL_ASSISTANT]: `Você é um assistente de vendas imobiliário PROATIVO e INOVADOR. Você EXECUTA ações, não delega para formulários.

**REGRAS DE OURO:**
1. **SEJA EXECUTOR, NÃO INTERMEDIÁRIO:** Quando o usuário pedir para criar/cadastrar algo, FAÇA. Não peça confirmação desnecessária.
2. **RESPEITE RBAC:** Você só pode acessar dados da agência do usuário.
3. **TRADUZA JSON:** Sempre converta dados técnicos para linguagem natural nas respostas.
4. **RETORNE LINKS:** Ao criar imóveis, SEMPRE inclua o link público do marketplace na resposta.
${session?.context?.attachedImages ? `\n**⚠️ IMPORTANTE - IMAGENS ANEXADAS:**\nO usuário anexou ${session.context.attachedImages.length} imagem(ns) nesta mensagem:\n${session.context.attachedImages.map((url: string, i: number) => `${i + 1}. ${url}`).join('\n')}\n\nQuando criar um imóvel, INCLUA TODAS estas URLs no campo "photos" da ferramenta create_property.\n` : ''}
**MENTALIDADE DE INOVAÇÃO:**
- ❌ NUNCA diga: "Vou abrir um formulário para você preencher"
- ✅ SEMPRE diga: "Aguarde, vou cadastrar o imóvel agora..."
- ✅ Extraia TODOS os dados do prompt do usuário
- ✅ Se faltar algo crítico, pergunte UMA VEZ e execute
- ✅ Retorne confirmação com link público para o usuário compartilhar

**CAPACIDADES (Ferramentas Disponíveis):**

1. **create_property** - CRIA imóvel diretamente com todos os dados
   - Aceita: título, tipo, descrição, preço, área, endereço, características, fotos (URLs)
   - Retorna: Link público do marketplace
   - Use quando: Usuário fornecer dados completos ou quase completos

2. **search_properties** - Busca imóveis com filtros
3. **get_property_details** - Obtém detalhes de um imóvel específico
4. **search_contacts** - Busca contatos/leads no CRM
5. **send_whatsapp_message** - Envia mensagem via WhatsApp

**EXEMPLO DE FLUXO INOVADOR (CRIAÇÃO):**

Usuário: "Crie um imóvel: Apartamento 4 quartos praia do morro, venda, R$ 1.500.000, 120m², Av Meaípe 390, Praia do Morro, Guarapari/ES, CEP 29109293"

Você (PENSAMENTO): Usuário forneceu TODOS os dados necessários. Vou EXECUTAR agora.
Você (RESPOSTA IMEDIATA): "Aguarde um momento, vou cadastrar o imóvel conforme solicitado..."

Você (AÇÃO): [Chama create_property com todos os dados extraídos]

Você (RESPOSTA FINAL): "✅ Pronto! Cadastrei o imóvel 'Apartamento 4 quartos praia do morro'.

📍 Endereço: Av Meaípe, 390 - Praia do Morro, Guarapari/ES
💰 Preço: R$ 1.500.000,00
📐 Área: 120m² | 🛏️ 4 quartos

🔗 Link público: http://localhost:5173/marketplace/property/[ID]

O imóvel já está visível no marketplace. Posso ajudar com mais alguma coisa?"

---

**EXEMPLO DE FLUXO (DADOS INCOMPLETOS):**

Usuário: "Cadastre um apartamento no Centro"

Você (PENSAMENTO): Faltam dados críticos (preço, área, endereço completo).
Você (RESPOSTA): "Vou cadastrar o apartamento no Centro. Para finalizar, preciso de:
- Preço de venda
- Área (m²)
- Endereço completo (rua, número, CEP)
- Número de quartos

Pode me passar essas informações?"

[Após usuário responder, EXECUTE create_property imediatamente]

---

**EXEMPLO DE FLUXO (BUSCA):**

Usuário: "Quais imóveis temos no Centro até R$ 500k?"

Você (AÇÃO): [Chama search_properties com filtros]
Você (RESPOSTA): "Encontrei 3 imóveis no Centro até R$ 500.000:

1. **Apartamento 2 quartos** - R$ 450.000 (80m²)
2. **Casa 3 quartos** - R$ 480.000 (120m²)
3. **Studio** - R$ 320.000 (45m²)

Quer detalhes de algum deles?"`,

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
   * ✅ CORRIGIDO: Agora aguarda a execução completa do agente
   * ✅ NOVO: Aceita imagens anexadas (uploadedImageUrls)
   */
  async chat(dto: ChatMessageDto, user: AuthenticatedUser): Promise<IAgentSession> {
    const session = await this.findSession(dto.sessionId, user);

    // ✅ NOVO: Se há imagens anexadas, injetar no contexto
    if (dto.uploadedImageUrls && dto.uploadedImageUrls.length > 0) {
      if (!session.context) {
        session.context = {};
      }
      session.context.attachedImages = dto.uploadedImageUrls;
      logger.info(`[AgentsService] ${dto.uploadedImageUrls.length} imagem(ns) anexada(s) ao contexto da sessão ${dto.sessionId}`);
    }

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

    // ✅ CORREÇÃO: Executar de forma SÍNCRONA ao invés de background
    // Isso garante que o frontend receba a sessão COMPLETA com a resposta do agente
    try {
      console.log('[AGENT CHAT] 🚀 Iniciando execução síncrona...');
      await this.executeAsync(session._id.toString(), user);
      console.log('[AGENT CHAT] ✅ Execução síncrona concluída');
    } catch (error) {
      logger.error(`[AGENT] Erro ao processar chat: ${error.message}`);
      // Atualizar status para erro
      await AgentSessionModel.findByIdAndUpdate(session._id, {
        agentStatus: AgentStatus.ERROR,
      });
    }

    // Buscar a sessão atualizada após a execução
    const updatedSession = await AgentSessionModel.findById(session._id);
    
    // ✅ NOVO: Se há arquivos rejeitados, adicionar mensagem de aviso
    if (dto.rejectedFiles && dto.rejectedFiles.length > 0 && updatedSession) {
      const warningMessage = this.buildRejectedFilesWarning(dto.rejectedFiles);
      updatedSession.messages.push({
        role: 'assistant',
        content: warningMessage,
        timestamp: new Date(),
      });
      await updatedSession.save();
      logger.warn(`[AgentsService] ${dto.rejectedFiles.length} arquivo(s) rejeitado(s) na sessão ${dto.sessionId}`);
    }
    
    console.log('[AGENT CHAT] 📤 Retornando sessão atualizada');
    console.log(`[AGENT CHAT] Total de mensagens: ${updatedSession?.messages.length || session.messages.length}`);
    console.log(`[AGENT CHAT] Status final: ${updatedSession?.agentStatus || session.agentStatus}`);
    
    if (updatedSession) {
      console.log('[AGENT CHAT] Últimas 3 mensagens:');
      updatedSession.messages.slice(-3).forEach((msg, i) => {
        console.log(`  ${i + 1}. [${msg.role}] ${msg.content.substring(0, 80)}...`);
      });
    }
    
    return updatedSession || session;
  }

  /**
   * Construir mensagem amigável sobre arquivos rejeitados
   */
  private buildRejectedFilesWarning(rejectedFiles: Array<{ name: string; reason: string }>): string {
    let message = '⚠️ **Aviso sobre arquivos anexados:**\n\n';
    
    if (rejectedFiles.length === 1) {
      message += `O arquivo "${rejectedFiles[0].name}" não pôde ser anexado. `;
      message += `Motivo: ${rejectedFiles[0].reason}.\n\n`;
    } else {
      message += `${rejectedFiles.length} arquivos não puderam ser anexados:\n\n`;
      rejectedFiles.forEach((file, index) => {
        message += `${index + 1}. **${file.name}**: ${file.reason}\n`;
      });
      message += '\n';
    }
    
    message += 'Os demais arquivos foram processados normalmente. Se precisar enviar esses arquivos, certifique-se de que sejam imagens válidas.';
    
    return message;
  }

  /**
   * Atualizar sessão (renomear, arquivar, etc)
   */
  async updateSession(
    sessionId: string,
    updates: { title?: string; status?: SessionStatus },
    user: AuthenticatedUser
  ): Promise<IAgentSession> {
    const session = await this.findSession(sessionId, user);

    if (updates.title !== undefined) {
      session.title = updates.title;
    }

    if (updates.status !== undefined) {
      session.status = updates.status;
    }

    await session.save();

    logger.info(`Sessão ${sessionId} atualizada: ${JSON.stringify(updates)}`);

    return session;
  }

  /**
   * Deletar sessão
   */
  async deleteSession(sessionId: string, user: AuthenticatedUser): Promise<void> {
    const session = await this.findSession(sessionId, user);

    await AgentSessionModel.deleteOne({ _id: session._id });

    logger.info(`Sessão ${sessionId} deletada pelo usuário ${user.email}`);
  }
}

export const agentsService = new AgentsService();
