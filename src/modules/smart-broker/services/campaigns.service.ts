import { Types } from 'mongoose';
import { CampaignModel, ICampaign, CampaignStatus, CampaignType } from '../models/campaign.model';
import { ContactModel, ContactStatus } from '../models/contact.model';
import { BadRequestException, NotFoundException, ForbiddenException } from '../../../exceptions';
import { UserRole } from '../types/roles.enum';
import { AuthenticatedUser } from '../types/auth.types';
import { evolutionBridgeService } from './evolution-bridge.service';
import { Logger } from '../../../config/logger.config';

const logger = new Logger('CampaignsService');

export interface CreateCampaignDto {
  name: string;
  description?: string;
  type: CampaignType;
  agency: string;
  audience: {
    targetAgency?: string;
    targetStatus?: ContactStatus[];
    targetTags?: string[];
    specificContacts?: string[];
  };
  message: {
    template: string;
    variables?: Record<string, string>;
    mediaUrl?: string;
    mediaType?: 'image' | 'document' | 'video';
  };
  schedule?: {
    startDate?: Date;
    endDate?: Date;
    frequency?: 'once' | 'daily' | 'weekly' | 'monthly';
    timeOfDay?: string;
    sendImmediately?: boolean;
  };
  evolutionInstanceId: string;
  rateLimitMs?: number;
  maxRetries?: number;
}

export interface UpdateCampaignDto {
  name?: string;
  description?: string;
  status?: CampaignStatus;
  audience?: any;
  message?: any;
  schedule?: any;
}

export class CampaignsService {
  /**
   * Criar nova campanha
   */
  async create(dto: CreateCampaignDto, user: AuthenticatedUser): Promise<ICampaign> {
    // Validar agencyId
    if (!Types.ObjectId.isValid(dto.agency)) {
      throw new BadRequestException('ID da agência inválido');
    }

    // RBAC: Verificar se usuário pode criar campanha nesta agência
    if (user.role !== UserRole.ADMIN && user.agencyId !== dto.agency) {
      throw new ForbiddenException('Você só pode criar campanhas na sua própria agência');
    }

    // Calcular audiência inicial
    const audienceCount = await this.calculateAudienceCount(dto.audience, dto.agency);

    const campaign = new CampaignModel({
      ...dto,
      agency: new Types.ObjectId(dto.agency),
      createdBy: new Types.ObjectId(user.userId),
      status: CampaignStatus.DRAFT,
      statistics: {
        totalContacts: audienceCount,
        sent: 0,
        delivered: 0,
        read: 0,
        replied: 0,
        failed: 0,
      },
    });

    // Se tem agendamento configurado
    if (dto.schedule) {
      const { startDate, sendImmediately } = dto.schedule;
      if (sendImmediately) {
        campaign.status = CampaignStatus.SCHEDULED;
        campaign.nextExecutionDate = new Date();
        logger.info(`Campanha ${campaign.name} configurada para execução imediata`);
      } else if (startDate) {
        campaign.status = CampaignStatus.SCHEDULED;
        campaign.nextExecutionDate = new Date(startDate);
        logger.info(`Campanha ${campaign.name} agendada para ${campaign.nextExecutionDate.toISOString()}`);
      }
    }

    const savedCampaign = await campaign.save();
    logger.info(`Campanha ${savedCampaign.name} criada com ID: ${savedCampaign._id}`);

    // Se sendImmediately, executar agora em background (não aguardar)
    if (dto.schedule?.sendImmediately) {
      logger.info(`Iniciando execução imediata da campanha ${savedCampaign._id}`);
      setImmediate(() => {
        this.execute(savedCampaign._id.toString(), user).catch((error) => {
          logger.error(`Erro ao executar campanha imediatamente: ${error.message}`);
        });
      });
    }

    return savedCampaign;
  }

  /**
   * Calcular tamanho da audiência baseado nos filtros
   */
  private async calculateAudienceCount(audience: any, agencyId: string): Promise<number> {
    const query: any = { isActive: true, agency: new Types.ObjectId(agencyId) };

    if (audience.specificContacts && audience.specificContacts.length > 0) {
      return audience.specificContacts.length;
    }

    if (audience.targetStatus && audience.targetStatus.length > 0) {
      query.status = { $in: audience.targetStatus };
    }

    if (audience.targetTags && audience.targetTags.length > 0) {
      query.tags = { $in: audience.targetTags };
    }

    const count = await ContactModel.countDocuments(query);
    return count;
  }

  /**
   * Listar campanhas com filtros (com RBAC)
   */
  async findAll(
    user: AuthenticatedUser,
    filters?: {
      agency?: string;
      status?: CampaignStatus;
      type?: CampaignType;
    }
  ): Promise<ICampaign[]> {
    const query: any = { isActive: true };

    // RBAC: Aplicar scoping por agência
    if (user.role === UserRole.ADMIN) {
      // Admin vê todas as campanhas (ou filtra por agência se fornecida)
      if (filters?.agency && Types.ObjectId.isValid(filters.agency)) {
        query.agency = new Types.ObjectId(filters.agency);
      }
    } else {
      // Outros roles: apenas campanhas da própria agência
      if (!user.agencyId) {
        throw new ForbiddenException('Usuário não possui agência associada');
      }
      query.agency = new Types.ObjectId(user.agencyId);
    }

    // Aplicar filtros adicionais
    if (filters?.status) {
      query.status = filters.status;
    }
    if (filters?.type) {
      query.type = filters.type;
    }

    const campaigns = await CampaignModel.find(query).sort({ createdAt: -1 }).exec();
    return campaigns;
  }

  /**
   * Buscar campanha por ID (com RBAC)
   */
  async findOne(id: string, user: AuthenticatedUser): Promise<ICampaign> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('ID inválido');
    }

    const campaign = await CampaignModel.findById(id).exec();

    if (!campaign) {
      throw new NotFoundException('Campanha não encontrada');
    }

    // RBAC: Verificar se usuário pode ver esta campanha
    if (user.role !== UserRole.ADMIN && campaign.agency.toString() !== user.agencyId) {
      throw new ForbiddenException('Você não tem permissão para visualizar esta campanha');
    }

    return campaign;
  }

  /**
   * Atualizar campanha (com RBAC)
   */
  async update(id: string, dto: UpdateCampaignDto, user: AuthenticatedUser): Promise<ICampaign> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('ID inválido');
    }

    const campaign = await CampaignModel.findById(id).exec();

    if (!campaign) {
      throw new NotFoundException('Campanha não encontrada');
    }

    // RBAC: Verificar permissão para modificar
    if (user.role === UserRole.ADMIN) {
      // Admin pode modificar qualquer campanha
    } else if (user.role === UserRole.MANAGER) {
      // Manager pode modificar campanhas da própria agência
      if (campaign.agency.toString() !== user.agencyId) {
        throw new ForbiddenException('Você só pode modificar campanhas da sua agência');
      }
    } else {
      // Agent/Viewer não podem modificar
      throw new ForbiddenException('Você não tem permissão para modificar campanhas');
    }

    // Não permitir editar campanha em execução
    if (campaign.status === CampaignStatus.RUNNING) {
      throw new BadRequestException('Não é possível editar campanha em execução');
    }

    // Atualizar campos
    Object.assign(campaign, dto);
    const updatedCampaign = await campaign.save();

    return updatedCampaign;
  }

  /**
   * Executar campanha (enviar mensagens para audiência)
   * TODO: Implementar com Bull queue para async execution
   */
  async execute(id: string, user: AuthenticatedUser): Promise<{ message: string; jobId?: string }> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('ID inválido');
    }

    const campaign = await CampaignModel.findById(id).exec();

    if (!campaign) {
      throw new NotFoundException('Campanha não encontrada');
    }

    // RBAC: Verificar permissão
    if (user.role !== UserRole.ADMIN && campaign.agency.toString() !== user.agencyId) {
      throw new ForbiddenException('Você não tem permissão para executar esta campanha');
    }

    // Validar status
    if (campaign.status === CampaignStatus.RUNNING) {
      throw new BadRequestException('Campanha já está em execução');
    }

    if (campaign.status === CampaignStatus.COMPLETED) {
      throw new BadRequestException('Campanha já foi concluída');
    }

    // Atualizar status
    campaign.status = CampaignStatus.RUNNING;
    campaign.lastExecutionDate = new Date();
    await campaign.save();

    logger.info(`Executando campanha ${campaign.name} (${campaign._id})`);

    // Buscar contatos da audiência
    const contacts = await this.getAudienceContacts(campaign);

    if (contacts.length === 0) {
      campaign.status = CampaignStatus.COMPLETED;
      await campaign.save();
      throw new BadRequestException('Nenhum contato encontrado na audiência');
    }

    logger.info(`Encontrados ${contacts.length} contatos para campanha ${campaign._id}`);

    // TODO: Em produção, usar Bull queue para processar em background
    // Por enquanto, processamento síncrono (não recomendado para produção)
    let sent = 0;
    let failed = 0;

    for (const contact of contacts) {
      try {
        // Aplicar rate limit se configurado
        if (campaign.rateLimitMs && campaign.rateLimitMs > 0) {
          await new Promise((resolve) => setTimeout(resolve, campaign.rateLimitMs));
        }

        // Substituir variáveis no template
        const variablesObj = campaign.message.variables
          ? Object.fromEntries(campaign.message.variables)
          : {};
        const message = this.replaceVariables(campaign.message.template, variablesObj, contact);

        // Enviar mensagem via Evolution API
        await evolutionBridgeService.sendTextMessage(campaign.evolutionInstanceId, {
          number: contact.phone,
          text: message,
        });

        sent++;
        logger.info(`Mensagem enviada para ${contact.name} (${contact.phone})`);
      } catch (error) {
        failed++;
        logger.error(`Erro ao enviar mensagem para ${contact.name}: ${error.message}`);
      }
    }

    // Atualizar estatísticas
    campaign.statistics.sent = sent;
    campaign.statistics.failed = failed;
    campaign.status = CampaignStatus.COMPLETED;
    await campaign.save();

    logger.info(`Campanha ${campaign._id} concluída: ${sent} enviadas, ${failed} falhas`);

    return {
      message: `Campanha executada com sucesso. ${sent} mensagens enviadas, ${failed} falhas.`,
    };
  }

  /**
   * Buscar contatos da audiência
   */
  private async getAudienceContacts(campaign: ICampaign): Promise<any[]> {
    const audience = campaign.audience;

    // Se há contatos específicos, retorná-los
    if (audience.specificContacts && audience.specificContacts.length > 0) {
      const contacts = await ContactModel.find({
        _id: { $in: audience.specificContacts.map((id) => new Types.ObjectId(id)) },
        isActive: true,
      }).exec();
      return contacts;
    }

    // Caso contrário, aplicar filtros
    const query: any = { isActive: true, agency: campaign.agency };

    if (audience.targetStatus && audience.targetStatus.length > 0) {
      query.status = { $in: audience.targetStatus };
    }

    if (audience.targetTags && audience.targetTags.length > 0) {
      query.tags = { $in: audience.targetTags };
    }

    const contacts = await ContactModel.find(query).exec();
    return contacts;
  }

  /**
   * Substituir variáveis no template de mensagem
   */
  private replaceVariables(template: string, variables: Record<string, string>, contact: any): string {
    let message = template;

    // Substituir variáveis globais
    for (const [key, value] of Object.entries(variables)) {
      message = message.replace(new RegExp(`{{${key}}}`, 'g'), value);
    }

    // Substituir variáveis do contato
    message = message.replace(/{{contact\.name}}/g, contact.name || 'Cliente');
    message = message.replace(/{{contact\.email}}/g, contact.email || '');
    message = message.replace(/{{contact\.phone}}/g, contact.phone || '');

    return message;
  }

  /**
   * Deletar campanha (soft delete com RBAC)
   */
  async remove(id: string, user: AuthenticatedUser): Promise<void> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('ID inválido');
    }

    const campaign = await CampaignModel.findById(id).exec();

    if (!campaign) {
      throw new NotFoundException('Campanha não encontrada');
    }

    // RBAC: Verificar permissão para deletar
    if (user.role === UserRole.ADMIN) {
      // Admin pode deletar qualquer campanha
    } else if (user.role === UserRole.MANAGER) {
      // Manager pode deletar campanhas da própria agência
      if (campaign.agency.toString() !== user.agencyId) {
        throw new ForbiddenException('Você só pode deletar campanhas da sua agência');
      }
    } else {
      // Agent/Viewer não podem deletar
      throw new ForbiddenException('Você não tem permissão para deletar campanhas');
    }

    // Não permitir deletar campanha em execução
    if (campaign.status === CampaignStatus.RUNNING) {
      throw new BadRequestException('Não é possível deletar campanha em execução');
    }

    // Soft delete
    campaign.isActive = false;
    await campaign.save();
  }
}

export const campaignsService = new CampaignsService();
