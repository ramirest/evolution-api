import { Types } from 'mongoose';
import { AgencyModel, IAgency } from '../models/agency.model';
import { UserModel } from '../models/user.model';
import { BadRequestException, NotFoundException, ForbiddenException, ConflictException } from '../../../exceptions';
import { UserRole } from '../types/roles.enum';
import { AuthenticatedUser } from '../types/auth.types';

export interface CreateAgencyDto {
  name: string;
  cnpj: string;
  description?: string;
  phone: string;
  email: string;
  address: {
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
    zipCode: string;
  };
  maxInstances?: number;
  settings?: {
    workingHours?: {
      start: string;
      end: string;
    };
    timezone?: string;
    autoAssignLeads?: boolean;
  };
}

export interface UpdateAgencyDto {
  name?: string;
  cnpj?: string;
  description?: string;
  phone?: string;
  email?: string;
  address?: any;
  maxInstances?: number;
  settings?: any;
}

export class AgenciesService {
  /**
   * Criar nova agência (Admin ou primeiro usuário do sistema)
   */
  async create(dto: CreateAgencyDto, user: AuthenticatedUser): Promise<IAgency> {
    // Verificar se CNPJ já existe
    const existingAgency = await AgencyModel.findOne({ cnpj: dto.cnpj });
    if (existingAgency) {
      throw new ConflictException('CNPJ já está cadastrado');
    }

    // Criar agência
    const agency = new AgencyModel({
      ...dto,
      owner: new Types.ObjectId(user.userId),
      members: [],
    });

    const savedAgency = await agency.save();

    // Atualizar agencyId do owner (importante para RBAC)
    const updatedOwner = await UserModel.findByIdAndUpdate(
      user.userId,
      { agencyId: savedAgency._id },
      { new: true } // Retornar documento atualizado
    );
    
    console.log(`[AgenciesService] Owner atualizado: ${updatedOwner?.email}, agencyId: ${updatedOwner?.agencyId}`);

    return savedAgency;
  }

  /**
   * Listar todas as agências (Admin only)
   */
  async findAll(user: AuthenticatedUser): Promise<IAgency[]> {
    // Apenas Admin pode ver todas as agências
    if (user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Apenas administradores podem listar todas as agências');
    }

    const agencies = await AgencyModel.find().exec();
    return agencies;
  }

  /**
   * Buscar agências do usuário logado (owner ou member)
   */
  async findByUser(user: AuthenticatedUser): Promise<IAgency[]> {
    const agencies = await AgencyModel.find({
      $or: [
        { owner: new Types.ObjectId(user.userId) },
        { members: new Types.ObjectId(user.userId) },
      ],
    }).exec();

    return agencies;
  }

  /**
   * Buscar agência por ID (com RBAC)
   */
  async findOne(id: string, user: AuthenticatedUser): Promise<IAgency> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('ID inválido');
    }

    const agency = await AgencyModel.findById(id).exec();

    if (!agency) {
      throw new NotFoundException('Agência não encontrada');
    }

    // RBAC: Verificar se usuário pode ver esta agência
    if (user.role !== UserRole.ADMIN && agency._id.toString() !== user.agencyId) {
      throw new ForbiddenException('Você não tem permissão para visualizar esta agência');
    }

    return agency;
  }

  /**
   * Atualizar agência (Owner ou Admin)
   */
  async update(id: string, dto: UpdateAgencyDto, user: AuthenticatedUser): Promise<IAgency> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('ID inválido');
    }

    const agency = await AgencyModel.findById(id).exec();

    if (!agency) {
      throw new NotFoundException('Agência não encontrada');
    }

    // RBAC: Verificar permissão para atualizar
    if (user.role === UserRole.ADMIN) {
      // Admin pode atualizar qualquer agência
    } else if (agency.owner.toString() === user.userId) {
      // Owner pode atualizar sua própria agência
    } else {
      throw new ForbiddenException('Você não tem permissão para atualizar esta agência');
    }

    // Se estiver atualizando CNPJ, verificar duplicidade
    if (dto.cnpj && dto.cnpj !== agency.cnpj) {
      const existingAgency = await AgencyModel.findOne({
        cnpj: dto.cnpj,
        _id: { $ne: id },
      });
      if (existingAgency) {
        throw new ConflictException('CNPJ já está em uso');
      }
    }

    // Atualizar campos
    Object.assign(agency, dto);
    const updatedAgency = await agency.save();

    return updatedAgency;
  }

  /**
   * Adicionar membro à agência (Owner ou Admin)
   */
  async addMember(agencyId: string, userId: string, user: AuthenticatedUser): Promise<IAgency> {
    if (!Types.ObjectId.isValid(agencyId) || !Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('IDs inválidos');
    }

    const agency = await AgencyModel.findById(agencyId).exec();

    if (!agency) {
      throw new NotFoundException('Agência não encontrada');
    }

    // RBAC: Verificar permissão
    if (user.role !== UserRole.ADMIN && agency.owner.toString() !== user.userId) {
      throw new ForbiddenException('Apenas o proprietário ou admin pode adicionar membros');
    }

    // Verificar se usuário existe
    const userToAdd = await UserModel.findById(userId).exec();
    if (!userToAdd) {
      throw new NotFoundException('Usuário não encontrado');
    }

    // Verificar se já é membro
    if (agency.members.some((m) => m.toString() === userId)) {
      throw new ConflictException('Usuário já é membro desta agência');
    }

    // Adicionar membro
    agency.members.push(new Types.ObjectId(userId));
    await agency.save();

    // Atualizar agencyId do usuário
    await UserModel.findByIdAndUpdate(userId, {
      agencyId: agency._id,
    });

    return agency;
  }

  /**
   * Remover membro da agência (Owner ou Admin)
   */
  async removeMember(agencyId: string, userId: string, user: AuthenticatedUser): Promise<IAgency> {
    if (!Types.ObjectId.isValid(agencyId) || !Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('IDs inválidos');
    }

    const agency = await AgencyModel.findById(agencyId).exec();

    if (!agency) {
      throw new NotFoundException('Agência não encontrada');
    }

    // RBAC: Verificar permissão
    if (user.role !== UserRole.ADMIN && agency.owner.toString() !== user.userId) {
      throw new ForbiddenException('Apenas o proprietário ou admin pode remover membros');
    }

    // Não permitir remover o owner
    if (agency.owner.toString() === userId) {
      throw new BadRequestException('Não é possível remover o proprietário da agência');
    }

    // Remover membro
    agency.members = agency.members.filter((m) => m.toString() !== userId);
    await agency.save();

    // Remover agencyId do usuário
    await UserModel.findByIdAndUpdate(userId, {
      agencyId: null,
    });

    return agency;
  }

  /**
   * Deletar agência (Admin only)
   */
  async remove(id: string, user: AuthenticatedUser): Promise<void> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('ID inválido');
    }

    // Apenas Admin pode deletar agências
    if (user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Apenas administradores podem deletar agências');
    }

    const agency = await AgencyModel.findById(id).exec();

    if (!agency) {
      throw new NotFoundException('Agência não encontrada');
    }

    // Soft delete
    agency.isActive = false;
    await agency.save();

    // Remover agencyId de todos os usuários
    await UserModel.updateMany(
      { agencyId: agency._id },
      { agencyId: null }
    );
  }

  /**
   * Obter estatísticas da agência (Owner, Manager ou Admin)
   */
  async getStats(agencyId: string, user: AuthenticatedUser): Promise<any> {
    if (!Types.ObjectId.isValid(agencyId)) {
      throw new BadRequestException('ID inválido');
    }

    const agency = await AgencyModel.findById(agencyId).exec();

    if (!agency) {
      throw new NotFoundException('Agência não encontrada');
    }

    // RBAC: Verificar permissão
    if (user.role !== UserRole.ADMIN && agency._id.toString() !== user.agencyId) {
      throw new ForbiddenException('Você não tem permissão para visualizar estatísticas desta agência');
    }

    // Contar recursos da agência (usando modelos Mongoose)
    const { PropertyModel } = await import('../models/property.model');
    const { ContactModel } = await import('../models/contact.model');
    const { CampaignModel } = await import('../models/campaign.model');

    console.log(`[AgenciesService.getStats] Contando recursos para agência: ${agency._id}`);
    
    const [propertiesCount, contactsCount, campaignsCount, membersCount] = await Promise.all([
      PropertyModel.countDocuments({ agency: agency._id, isActive: true }),
      ContactModel.countDocuments({ agency: agency._id, isActive: true }),
      CampaignModel.countDocuments({ agency: agency._id, isActive: true }),
      UserModel.countDocuments({ agencyId: agency._id, isActive: true }),
    ]);

    console.log(`[AgenciesService.getStats] Counts - Properties: ${propertiesCount}, Contacts: ${contactsCount}, Campaigns: ${campaignsCount}, Members: ${membersCount}`);

    return {
      agency: {
        id: agency._id,
        name: agency.name,
        cnpj: agency.cnpj,
      },
      stats: {
        properties: propertiesCount,
        contacts: contactsCount,
        campaigns: campaignsCount,
        members: membersCount,
        maxInstances: agency.maxInstances || 1,
      },
    };
  }
}

export const agenciesService = new AgenciesService();
