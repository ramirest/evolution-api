import { Types } from 'mongoose';
import { PropertyModel, IProperty, PropertyStatus, PropertyType, TransactionType } from '../models/property.model';
import { BadRequestException, NotFoundException, ForbiddenException } from '../../../exceptions';
import { UserRole } from '../types/roles.enum';
import { AuthenticatedUser } from '../types/auth.types';

export interface PropertyFilters {
  type?: PropertyType;
  transactionType?: TransactionType;
  status?: PropertyStatus;
  minPrice?: number;
  maxPrice?: number;
  minArea?: number;
  maxArea?: number;
  city?: string;
  state?: string;
  neighborhood?: string;
  bedrooms?: number;
  bathrooms?: number;
  parkingSpaces?: number;
  agency?: string;
}

export interface CreatePropertyDto {
  type: PropertyType;
  transactionType: TransactionType;
  title: string;
  description: string;
  price: number;
  area: number;
  address: {
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
    zipCode: string;
    country?: string;
  };
  location?: {
    lat: number;
    lng: number;
  };
  features: {
    bedrooms?: number;
    bathrooms?: number;
    suites?: number;
    parkingSpaces?: number;
    hasElevator?: boolean;
    hasPool?: boolean;
    hasGym?: boolean;
    hasGrill?: boolean;
    isFurnished?: boolean;
    petsAllowed?: boolean;
  };
  photos?: string[];
  agency: string;
  iptuValue?: number;
  condominiumFee?: number;
  isActive?: boolean;
}

export interface UpdatePropertyDto {
  type?: PropertyType;
  transactionType?: TransactionType;
  title?: string;
  description?: string;
  price?: number;
  area?: number;
  address?: any;
  location?: any;
  features?: any;
  photos?: string[];
  status?: PropertyStatus;
  iptuValue?: number;
  condominiumFee?: number;
  isActive?: boolean;
}

export class PropertiesService {
  /**
   * Criar novo imóvel (com RBAC)
   */
  async create(dto: CreatePropertyDto, user: AuthenticatedUser): Promise<IProperty> {
    // Validar agencyId
    if (!Types.ObjectId.isValid(dto.agency)) {
      throw new BadRequestException('ID da agência inválido');
    }

    // RBAC: Verificar se usuário pode criar imóvel nesta agência
    console.log('[PropertiesService] Verificando RBAC para criar imóvel:');
    console.log('  user.role:', user.role);
    console.log('  user.agencyId:', user.agencyId);
    console.log('  dto.agency:', dto.agency);
    console.log('  Comparação:', user.agencyId, '!==', dto.agency, '=', user.agencyId !== dto.agency);
    
    if (user.role !== UserRole.ADMIN && user.agencyId !== dto.agency) {
      throw new ForbiddenException('Você só pode criar imóveis na sua própria agência');
    }

    const property = new PropertyModel({
      ...dto,
      owner: new Types.ObjectId(user.userId),
      agency: new Types.ObjectId(dto.agency),
      status: PropertyStatus.AVAILABLE,
      isActive: dto.isActive !== undefined ? dto.isActive : true,
    });

    const savedProperty = await property.save();
    return savedProperty;
  }

  /**
   * Listar imóveis com filtros (com RBAC)
   */
  async findAll(user: AuthenticatedUser, filters?: PropertyFilters): Promise<IProperty[]> {
    const query: any = { isActive: true };

    // RBAC: Aplicar scoping por agência
    if (user.role === UserRole.ADMIN) {
      // Admin vê todos os imóveis (ou filtra por agência se fornecida)
      if (filters?.agency && Types.ObjectId.isValid(filters.agency)) {
        query.agency = new Types.ObjectId(filters.agency);
      }
    } else {
      // Outros roles: apenas imóveis da própria agência
      if (!user.agencyId) {
        throw new ForbiddenException('Usuário não possui agência associada');
      }
      query.agency = new Types.ObjectId(user.agencyId);
    }

    // Aplicar filtros adicionais
    if (filters) {
      if (filters.type) query.type = filters.type;
      if (filters.transactionType) query.transactionType = filters.transactionType;
      if (filters.status) query.status = filters.status;

      if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
        query.price = {};
        if (filters.minPrice !== undefined) query.price.$gte = filters.minPrice;
        if (filters.maxPrice !== undefined) query.price.$lte = filters.maxPrice;
      }

      if (filters.minArea !== undefined || filters.maxArea !== undefined) {
        query.area = {};
        if (filters.minArea !== undefined) query.area.$gte = filters.minArea;
        if (filters.maxArea !== undefined) query.area.$lte = filters.maxArea;
      }

      if (filters.city) query['address.city'] = new RegExp(filters.city, 'i');
      if (filters.state) query['address.state'] = filters.state.toUpperCase();
      if (filters.neighborhood) {
        query['address.neighborhood'] = new RegExp(filters.neighborhood, 'i');
      }

      if (filters.bedrooms !== undefined) {
        query['features.bedrooms'] = { $gte: filters.bedrooms };
      }
      if (filters.bathrooms !== undefined) {
        query['features.bathrooms'] = { $gte: filters.bathrooms };
      }
      if (filters.parkingSpaces !== undefined) {
        query['features.parkingSpaces'] = { $gte: filters.parkingSpaces };
      }
    }

    const properties = await PropertyModel.find(query).sort({ createdAt: -1 }).exec();
    return properties;
  }

  /**
   * Buscar imóvel por ID (com RBAC)
   */
  async findOne(id: string, user: AuthenticatedUser): Promise<IProperty> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('ID inválido');
    }

    const property = await PropertyModel.findById(id).exec();

    if (!property) {
      throw new NotFoundException('Imóvel não encontrado');
    }

    // RBAC: Verificar se usuário pode ver este imóvel
    if (user.role !== UserRole.ADMIN && property.agency.toString() !== user.agencyId) {
      throw new ForbiddenException('Você não tem permissão para visualizar este imóvel');
    }

    // Incrementar visualizações
    await PropertyModel.findByIdAndUpdate(id, { $inc: { views: 1 } });

    return property;
  }

  /**
   * Atualizar imóvel (com RBAC)
   */
  async update(id: string, dto: UpdatePropertyDto, user: AuthenticatedUser): Promise<IProperty> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('ID inválido');
    }

    const property = await PropertyModel.findById(id).exec();

    if (!property) {
      throw new NotFoundException('Imóvel não encontrado');
    }

    // RBAC: Verificar permissão para modificar
    if (user.role === UserRole.ADMIN) {
      // Admin pode modificar qualquer imóvel
    } else if (user.role === UserRole.MANAGER) {
      // Manager pode modificar imóveis da própria agência
      if (property.agency.toString() !== user.agencyId) {
        throw new ForbiddenException('Você só pode modificar imóveis da sua agência');
      }
    } else {
      // Agent/Viewer não podem modificar
      throw new ForbiddenException('Você não tem permissão para modificar imóveis');
    }

    // Atualizar campos
    Object.assign(property, dto);
    const updatedProperty = await property.save();

    return updatedProperty;
  }

  /**
   * Deletar imóvel (soft delete com RBAC)
   */
  async remove(id: string, user: AuthenticatedUser): Promise<void> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('ID inválido');
    }

    const property = await PropertyModel.findById(id).exec();

    if (!property) {
      throw new NotFoundException('Imóvel não encontrado');
    }

    // RBAC: Verificar permissão para deletar
    if (user.role === UserRole.ADMIN) {
      // Admin pode deletar qualquer imóvel
    } else if (user.role === UserRole.MANAGER) {
      // Manager pode deletar imóveis da própria agência
      if (property.agency.toString() !== user.agencyId) {
        throw new ForbiddenException('Você só pode deletar imóveis da sua agência');
      }
    } else {
      // Agent/Viewer não podem deletar
      throw new ForbiddenException('Você não tem permissão para deletar imóveis');
    }

    // Soft delete
    property.isActive = false;
    await property.save();
  }

  /**
   * Buscar imóveis recomendados para um contato (usado pelo agente de IA)
   */
  async findRecommended(preferences: {
    propertyType?: PropertyType;
    transactionType?: TransactionType;
    minPrice?: number;
    maxPrice?: number;
    city?: string;
    neighborhood?: string;
    bedrooms?: number;
  }, agencyId: string, limit: number = 5): Promise<IProperty[]> {
    const query: any = {
      isActive: true,
      status: PropertyStatus.AVAILABLE,
      agency: new Types.ObjectId(agencyId),
    };

    if (preferences.propertyType) query.type = preferences.propertyType;
    if (preferences.transactionType) query.transactionType = preferences.transactionType;

    if (preferences.minPrice || preferences.maxPrice) {
      query.price = {};
      if (preferences.minPrice) query.price.$gte = preferences.minPrice;
      if (preferences.maxPrice) query.price.$lte = preferences.maxPrice;
    }

    if (preferences.city) query['address.city'] = new RegExp(preferences.city, 'i');
    if (preferences.neighborhood) {
      query['address.neighborhood'] = new RegExp(preferences.neighborhood, 'i');
    }

    if (preferences.bedrooms) {
      query['features.bedrooms'] = { $gte: preferences.bedrooms };
    }

    const properties = await PropertyModel.find(query).limit(limit).sort({ createdAt: -1 }).exec();
    return properties;
  }
}

export const propertiesService = new PropertiesService();
