import { Types } from 'mongoose';
import { ContactModel, IContact, ContactStatus, ContactOrigin } from '../models/contact.model';
import { BadRequestException, NotFoundException, ForbiddenException } from '../../../exceptions';
import { UserRole } from '../types/roles.enum';
import { AuthenticatedUser } from '../types/auth.types';
import { evolutionBridgeService } from './evolution-bridge.service';

export interface ContactFilters {
  status?: ContactStatus;
  origin?: ContactOrigin;
  agency?: string;
  assignedTo?: string;
  tags?: string[];
  urgency?: string;
}

export interface CreateContactDto {
  name: string;
  phone: string;
  email?: string;
  cpf?: string;
  origin: ContactOrigin;
  status?: ContactStatus;
  notes?: string;
  agency?: string;
  assignedTo?: string;
  interestedProperties?: string[];
  tags?: string[];
  preferences?: {
    propertyType?: string;
    budget?: { min: number; max: number };
    locations?: string[];
  };
}

export interface UpdateContactDto {
  name?: string;
  phone?: string;
  email?: string;
  cpf?: string;
  status?: ContactStatus;
  notes?: string;
  assignedTo?: string;
  interestedProperties?: string[];
  tags?: string[];
  preferences?: any;
  urgency?: string;
}

export interface AddInteractionDto {
  type: 'whatsapp' | 'call' | 'email' | 'visit' | 'other';
  description: string;
  metadata?: Record<string, any>;
}

export class ContactsService {
  /**
   * Criar novo contato (com RBAC)
   */
  async create(dto: CreateContactDto, user: AuthenticatedUser): Promise<IContact> {
    // Usa a agência do usuário se não fornecida no DTO
    const agencyId = dto.agency?.trim() || user.agencyId;

    // Permitir contatos sem agência apenas para ADMIN
    if (!agencyId && user.role !== UserRole.ADMIN) {
      throw new BadRequestException('Agência é obrigatória. Usuário não possui agência associada.');
    }

    // Validar agencyId
    if (agencyId && !Types.ObjectId.isValid(agencyId)) {
      throw new BadRequestException('ID da agência inválido');
    }

    // Validar assignedTo
    if (dto.assignedTo && !Types.ObjectId.isValid(dto.assignedTo)) {
      throw new BadRequestException('ID do usuário responsável inválido');
    }

    // Validar imóveis de interesse
    if (dto.interestedProperties) {
      for (const propertyId of dto.interestedProperties) {
        if (!Types.ObjectId.isValid(propertyId)) {
          throw new BadRequestException(`ID de imóvel inválido: ${propertyId}`);
        }
      }
    }

    const contact = new ContactModel({
      ...dto,
      agency: agencyId ? new Types.ObjectId(agencyId) : undefined,
      assignedTo: dto.assignedTo ? new Types.ObjectId(dto.assignedTo) : undefined,
      interestedProperties: (dto.interestedProperties || []).map((id) => new Types.ObjectId(id)),
      lastContactDate: new Date(),
      status: dto.status || ContactStatus.NEW,
    });

    const savedContact = await contact.save();
    return savedContact;
  }

  /**
   * Listar contatos com filtros (com RBAC)
   */
  async findAll(user: AuthenticatedUser, filters?: ContactFilters): Promise<IContact[]> {
    const query: any = { isActive: true };

    // RBAC: Aplicar scoping por agência
    if (user.role === UserRole.ADMIN) {
      // Admin vê todos os contatos (ou filtra por agência se fornecida)
      if (filters?.agency && Types.ObjectId.isValid(filters.agency)) {
        query.agency = new Types.ObjectId(filters.agency);
      }
    } else {
      // Outros roles: apenas contatos da própria agência
      if (!user.agencyId) {
        throw new ForbiddenException('Usuário não possui agência associada');
      }
      query.agency = new Types.ObjectId(user.agencyId);

      // Agent vê apenas seus próprios contatos
      if (user.role === UserRole.AGENT) {
        query.assignedTo = new Types.ObjectId(user.userId);
      }
    }

    // Aplicar filtros adicionais
    if (filters) {
      if (filters.status) query.status = filters.status;
      if (filters.origin) query.origin = filters.origin;
      if (filters.urgency) query.urgency = filters.urgency;

      if (filters.assignedTo && Types.ObjectId.isValid(filters.assignedTo)) {
        query.assignedTo = new Types.ObjectId(filters.assignedTo);
      }

      if (filters.tags && filters.tags.length > 0) {
        query.tags = { $in: filters.tags };
      }
    }

    const contacts = await ContactModel.find(query).sort({ createdAt: -1 }).exec();
    return contacts;
  }

  /**
   * Buscar contato por ID (com RBAC)
   */
  async findOne(id: string, user: AuthenticatedUser): Promise<IContact> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('ID inválido');
    }

    const contact = await ContactModel.findById(id).exec();

    if (!contact) {
      throw new NotFoundException('Contato não encontrado');
    }

    // RBAC: Verificar se usuário pode ver este contato
    if (user.role === UserRole.ADMIN) {
      // Admin pode ver qualquer contato
    } else if (contact.agency && contact.agency.toString() !== user.agencyId) {
      throw new ForbiddenException('Você não tem permissão para visualizar este contato');
    } else if (user.role === UserRole.AGENT && contact.assignedTo?.toString() !== user.userId) {
      throw new ForbiddenException('Você só pode visualizar seus próprios contatos');
    }

    return contact;
  }

  /**
   * Atualizar contato (com RBAC)
   */
  async update(id: string, dto: UpdateContactDto, user: AuthenticatedUser): Promise<IContact> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('ID inválido');
    }

    const contact = await ContactModel.findById(id).exec();

    if (!contact) {
      throw new NotFoundException('Contato não encontrado');
    }

    // RBAC: Verificar permissão para modificar
    if (user.role === UserRole.ADMIN) {
      // Admin pode modificar qualquer contato
    } else if (user.role === UserRole.MANAGER) {
      // Manager pode modificar contatos da própria agência
      if (contact.agency && contact.agency.toString() !== user.agencyId) {
        throw new ForbiddenException('Você só pode modificar contatos da sua agência');
      }
    } else if (user.role === UserRole.AGENT) {
      // Agent pode modificar apenas seus próprios contatos
      if (contact.assignedTo?.toString() !== user.userId) {
        throw new ForbiddenException('Você só pode modificar seus próprios contatos');
      }
    } else {
      // Viewer não pode modificar
      throw new ForbiddenException('Você não tem permissão para modificar contatos');
    }

    // Validar assignedTo se fornecido
    if (dto.assignedTo && !Types.ObjectId.isValid(dto.assignedTo)) {
      throw new BadRequestException('ID do usuário responsável inválido');
    }

    // Atualizar campos
    Object.assign(contact, dto);
    if (dto.assignedTo) {
      contact.assignedTo = new Types.ObjectId(dto.assignedTo);
    }
    if (dto.interestedProperties) {
      contact.interestedProperties = dto.interestedProperties.map((id) => new Types.ObjectId(id));
    }

    const updatedContact = await contact.save();
    return updatedContact;
  }

  /**
   * Adicionar interação ao histórico do contato
   */
  async addInteraction(id: string, dto: AddInteractionDto, user: AuthenticatedUser): Promise<IContact> {
    const contact = await this.findOne(id, user);

    contact.interactions.push({
      type: dto.type,
      description: dto.description,
      date: new Date(),
      metadata: dto.metadata,
    } as any);

    contact.lastContactDate = new Date();
    const updatedContact = await contact.save();

    return updatedContact;
  }

  /**
   * Enviar mensagem WhatsApp para contato (usa EvolutionBridgeService)
   */
  async sendWhatsappMessage(
    contactId: string,
    message: string,
    evolutionInstanceId: string,
    user: AuthenticatedUser,
  ): Promise<any> {
    const contact = await this.findOne(contactId, user);

    if (!contact.phone) {
      throw new BadRequestException('Contato não possui telefone cadastrado');
    }

    // Enviar mensagem via Evolution API (chamada direta, sem HTTP)
    const result = await evolutionBridgeService.sendTextMessage(evolutionInstanceId, {
      number: contact.phone,
      text: message,
    });

    // Registrar interação
    await this.addInteraction(
      contactId,
      {
        type: 'whatsapp',
        description: message,
        metadata: { evolutionInstanceId, messageId: result.key?.id },
      },
      user,
    );

    return result;
  }

  /**
   * Buscar contato por telefone (usado por webhooks)
   */
  async findByPhone(phone: string, agencyId?: string): Promise<IContact | null> {
    const query: any = { phone, isActive: true };
    if (agencyId) {
      query.agency = new Types.ObjectId(agencyId);
    }

    const contact = await ContactModel.findOne(query).exec();
    return contact;
  }

  /**
   * Deletar contato (soft delete com RBAC)
   */
  async remove(id: string, user: AuthenticatedUser): Promise<void> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('ID inválido');
    }

    const contact = await ContactModel.findById(id).exec();

    if (!contact) {
      throw new NotFoundException('Contato não encontrado');
    }

    // RBAC: Verificar permissão para deletar
    if (user.role === UserRole.ADMIN) {
      // Admin pode deletar qualquer contato
    } else if (user.role === UserRole.MANAGER) {
      // Manager pode deletar contatos da própria agência
      if (contact.agency && contact.agency.toString() !== user.agencyId) {
        throw new ForbiddenException('Você só pode deletar contatos da sua agência');
      }
    } else {
      // Agent/Viewer não podem deletar
      throw new ForbiddenException('Você não tem permissão para deletar contatos');
    }

    // Soft delete
    contact.isActive = false;
    await contact.save();
  }
}

export const contactsService = new ContactsService();
