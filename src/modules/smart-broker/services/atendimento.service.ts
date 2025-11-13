import { Types } from 'mongoose';
import {
  AtendimentoSessionModel,
  IAtendimentoSession,
  AtendimentoStatus,
  IAtendimentoMessage,
} from '../models/atendimento-session.model';
import { agentsService } from './agents.service';
import { contactsService } from './contacts.service';
import { BadRequestException, NotFoundException, ForbiddenException } from '../../../exceptions';
import { AuthenticatedUser } from '../types/auth.types';
import { UserRole } from '../types/roles.enum';
import { Logger } from '../../../config/logger.config';
import { SENIOR_BROKER_AGENT_PROMPT, SENIOR_BROKER_TOOL_SCHEMAS } from '../agents/senior-broker.constants';
import {
  searchPropertiesTool,
  getPropertyDetailsTool,
  sendPropertyPhotosTool,
  scheduleVisitTool,
  transferToHumanTool,
} from '../agents/tools';

const logger = new Logger('AtendimentoService');

/**
 * ATENDIMENTO SERVICE
 * 
 * Gerencia o atendimento de clientes via WhatsApp.
 * Orquestra a IA (Agente Corretor Sênior) e o handoff para corretores humanos.
 */
export class AtendimentoService {
  /**
   * Lidar com mensagem recebida do webhook (Evolution API)
   * Esta é a porta de entrada do atendimento por IA
   */
  async handleIncomingMessage(messageData: {
    chatId: string;
    message: string;
    instanceName: string;
    senderName?: string;
    agencyId: string; // Identificado pelo número da instância
  }): Promise<void> {
    try {
      const { chatId, message, instanceName, senderName, agencyId } = messageData;

      logger.info(`[AtendimentoService] Nova mensagem de ${chatId}: "${message.substring(0, 50)}..."`);

      // 1. Buscar ou criar sessão
      let session = await AtendimentoSessionModel.findOne({ chatId, agencyId });

      if (!session) {
        logger.info(`[AtendimentoService] Criando nova sessão para ${chatId}`);
        session = new AtendimentoSessionModel({
          chatId,
          agencyId: new Types.ObjectId(agencyId),
          instanceName,
          status: AtendimentoStatus.OPEN_BY_AGENT,
          messages: [],
          metadata: {
            clientName: senderName,
          },
        });
      }

      // 2. Adicionar mensagem do usuário ao histórico
      session.messages.push({
        role: 'user',
        content: message,
        timestamp: new Date(),
      });
      session.lastMessageAt = new Date();

      // 3. TRIAGEM: Verificar se deve ser atendido pela IA ou humano
      if (
        session.status === AtendimentoStatus.PENDING_HUMAN_HANDOFF ||
        session.status === AtendimentoStatus.IN_PROGRESS_BY_HUMAN
      ) {
        // Se já está com humano, apenas salvar a mensagem
        await session.save();
        logger.info(`[AtendimentoService] Mensagem salva. Sessão está com humano (status: ${session.status})`);
        // TODO: Notificar corretor via Socket.IO
        return;
      }

      // 4. ATENDIMENTO POR IA (status === OPEN_BY_AGENT)
      await this.handleByAgent(session);
      await session.save();

    } catch (error: any) {
      logger.error(`[AtendimentoService] Erro ao processar mensagem: ${error.message}`);
      throw error;
    }
  }

  /**
   * Atendimento por IA (Agente Corretor Sênior)
   */
  private async handleByAgent(session: IAtendimentoSession): Promise<void> {
    try {
      logger.info(`[AtendimentoService] Processando com IA para sessão ${session._id}`);

      // Criar um user "virtual" para a agência (necessário para as ferramentas)
      // TODO: Melhorar isso, idealmente buscando um user real da agência
      const virtualUser: AuthenticatedUser = {
        sub: session.agencyId.toString(),
        userId: session.agencyId.toString(),
        email: `agency-${session.agencyId}@system.internal`,
        role: UserRole.AGENT,
        agencyId: session.agencyId.toString(),
      };

      // Preparar histórico para o agente
      const conversationHistory = session.messages.map((msg) => ({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content,
      }));

      // Mapa de ferramentas disponíveis para o Agente Corretor Sênior
      const toolsMap: Record<string, (data: string) => Promise<string>> = {
        search_properties: (data: string) => searchPropertiesTool(virtualUser, data),
        get_property_details: (data: string) => getPropertyDetailsTool(virtualUser, data),
        send_property_photos: (data: string) => sendPropertyPhotosTool(virtualUser, data, session.chatId),
        schedule_visit: (data: string) => scheduleVisitTool(virtualUser, data, session.contactId?.toString()),
        transfer_to_human: (data: string) => this.handleTransferToHuman(session, data),
      };

      // TODO: Chamar o agente de IA
      // Por enquanto, usar uma resposta de placeholder até implementarmos a integração completa
      const aiResponse = {
        message: 'Olá! Sou o assistente virtual. Como posso ajudá-lo hoje?',
        toolCalls: [],
      };

      // Adicionar resposta do agente ao histórico
      session.messages.push({
        role: 'agent',
        content: aiResponse.message,
        timestamp: new Date(),
        metadata: {
          toolCalls: aiResponse.toolCalls || [],
        },
      });

      // TODO: Enviar resposta para o cliente via Evolution API
      logger.info(`[AtendimentoService] Resposta da IA: "${aiResponse.message.substring(0, 100)}..."`);
      // await evolutionApiService.sendText(session.instanceName, session.chatId, aiResponse.message);

    } catch (error: any) {
      logger.error(`[AtendimentoService] Erro no atendimento por IA: ${error.message}`);
      
      // Resposta de fallback em caso de erro
      session.messages.push({
        role: 'agent',
        content: 'Desculpe, tive um problema técnico. Um corretor humano irá atendê-lo em breve.',
        timestamp: new Date(),
      });
      
      // Solicitar handoff automático
      session.status = AtendimentoStatus.PENDING_HUMAN_HANDOFF;
      session.handoffReason = `Erro técnico: ${error.message}`;
    }
  }

  /**
   * Handler para a ferramenta transfer_to_human
   */
  private async handleTransferToHuman(session: IAtendimentoSession, data: string): Promise<string> {
    try {
      const parsedData = JSON.parse(data);
      const { reason } = parsedData;

      logger.info(`[AtendimentoService] Transferindo sessão ${session._id} para humano. Motivo: ${reason}`);

      // Atualizar status da sessão
      session.status = AtendimentoStatus.PENDING_HUMAN_HANDOFF;
      session.handoffReason = reason;

      // TODO: Notificar corretores via Socket.IO
      // TODO: Enviar mensagem para o cliente informando que será atendido por um humano

      return '🙏 HANDOFF_SOLICITADO: A transferência para um corretor humano foi iniciada. Você não deve continuar o atendimento.';
    } catch (error: any) {
      logger.error(`[AtendimentoService] Erro ao transferir para humano: ${error.message}`);
      return `Erro ao transferir para humano: ${error.message}`;
    }
  }

  /**
   * Listar sessões de atendimento da agência do usuário
   */
  async findByAgency(
    user: AuthenticatedUser,
    filters?: {
      status?: AtendimentoStatus;
      assignedTo?: string;
    },
  ): Promise<IAtendimentoSession[]> {
    if (!user.agencyId) {
      throw new ForbiddenException('Usuário não possui agência associada');
    }

    const query: any = { agencyId: new Types.ObjectId(user.agencyId) };

    if (filters?.status) {
      query.status = filters.status;
    }

    if (filters?.assignedTo) {
      query.assignedTo = new Types.ObjectId(filters.assignedTo);
    }

    const sessions = await AtendimentoSessionModel.find(query)
      .sort({ lastMessageAt: -1 })
      .limit(100)
      .exec();

    return sessions;
  }

  /**
   * Buscar sessão por ID
   */
  async findOne(id: string, user: AuthenticatedUser): Promise<IAtendimentoSession> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('ID inválido');
    }

    const session = await AtendimentoSessionModel.findById(id).exec();

    if (!session) {
      throw new NotFoundException('Sessão não encontrada');
    }

    // RBAC: Verificar se o usuário tem acesso
    if (user.role !== UserRole.ADMIN && session.agencyId.toString() !== user.agencyId) {
      throw new ForbiddenException('Você não tem permissão para visualizar esta sessão');
    }

    return session;
  }

  /**
   * Corretor assume a sessão (handoff)
   */
  async assumeSession(id: string, user: AuthenticatedUser): Promise<IAtendimentoSession> {
    const session = await this.findOne(id, user);

    if (session.status === AtendimentoStatus.CLOSED) {
      throw new BadRequestException('Não é possível assumir uma sessão encerrada');
    }

    // Atualizar status
    session.status = AtendimentoStatus.IN_PROGRESS_BY_HUMAN;
    session.assignedTo = new Types.ObjectId(user.userId);

    // Adicionar mensagem de sistema
    session.messages.push({
      role: 'human',
      content: '[Corretor assumiu o atendimento]',
      timestamp: new Date(),
    });

    await session.save();

    logger.info(`[AtendimentoService] Sessão ${id} assumida por ${user.email}`);

    // TODO: Enviar mensagem para o cliente informando que o corretor assumiu

    return session;
  }

  /**
   * Corretor envia mensagem
   */
  async sendMessage(
    id: string,
    message: string,
    user: AuthenticatedUser,
  ): Promise<IAtendimentoSession> {
    const session = await this.findOne(id, user);

    if (session.status !== AtendimentoStatus.IN_PROGRESS_BY_HUMAN) {
      throw new BadRequestException('Você não pode enviar mensagens nesta sessão');
    }

    if (session.assignedTo?.toString() !== user.userId) {
      throw new ForbiddenException('Você não é o corretor responsável por esta sessão');
    }

    // Adicionar mensagem ao histórico
    session.messages.push({
      role: 'human',
      content: message,
      timestamp: new Date(),
    });
    session.lastMessageAt = new Date();

    await session.save();

    // TODO: Enviar mensagem para o cliente via Evolution API

    return session;
  }

  /**
   * Encerrar sessão
   */
  async closeSession(id: string, user: AuthenticatedUser): Promise<IAtendimentoSession> {
    const session = await this.findOne(id, user);

    session.status = AtendimentoStatus.CLOSED;
    await session.save();

    logger.info(`[AtendimentoService] Sessão ${id} encerrada por ${user.email}`);

    return session;
  }
}

export const atendimentoService = new AtendimentoService();
