import { Router, Response, NextFunction } from 'express';
import { propertiesService } from '../services/properties.service';
import { jwtAuthMiddleware } from '../middleware/jwt-auth.middleware';
import { rbacMiddleware } from '../middleware/rbac.middleware';
import { AuthenticatedRequest } from '../types/auth.types';
import { UserRole } from '../types/roles.enum';
import { Logger } from '../../../config/logger.config';

const logger = new Logger('PropertiesRouter');

export const propertiesRouter = Router();

/**
 * GET /properties (PUBLIC - NO AUTH)
 * Endpoint PÚBLICO (sem autenticação) para a Vitrine/Marketplace
 * Retorna imóveis de TODAS as agências com dados públicos
 * IMPORTANTE: Esta rota DEVE estar ANTES do jwtAuthMiddleware
 */
propertiesRouter.get(
  '/marketplace/',
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const filters = {
        type: req.query.type as any,
        transactionType: req.query.transactionType as any,
        location: req.query.location as string,
        priceMin: req.query.priceMin ? Number(req.query.priceMin) : undefined,
        priceMax: req.query.priceMax ? Number(req.query.priceMax) : undefined,
        bedrooms: req.query.bedrooms ? Number(req.query.bedrooms) : undefined,
        page: req.query.page ? Number(req.query.page) : 1,
        limit: req.query.limit ? Number(req.query.limit) : 12,
      };

      const result = await propertiesService.findPublic(filters);
      return res.json(result);
    } catch (error) {
      next(error);
    }
  },
);

/**
 * GET /properties/public/:id (PUBLIC - NO AUTH)
 * Endpoint PÚBLICO para ver detalhes de um imóvel específico
 * Usado pela página de detalhes do marketplace
 * IMPORTANTE: Esta rota DEVE estar ANTES do jwtAuthMiddleware
 */
propertiesRouter.get(
  '/marketplace/public/:id',
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const property = await propertiesService.findPublicById(req.params.id);
      return res.json(property);
    } catch (error) {
      next(error);
    }
  },
);

// Todos os endpoints ABAIXO exigem autenticação
propertiesRouter.use(jwtAuthMiddleware);

/**
 * POST /properties
 * Criar novo imóvel (Manager/Admin)
 */
propertiesRouter.post(
  '/',
  rbacMiddleware([UserRole.ADMIN, UserRole.MANAGER]),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const property = await propertiesService.create(req.body, req.user!);
      logger.info(`Imóvel criado: ${property._id} por ${req.user!.email}`);
      return res.status(201).json(property);
    } catch (error) {
      next(error);
    }
  },
);

/**
 * GET /properties
 * Listar imóveis com filtros (todos os roles)
 */
propertiesRouter.get(
  '/',
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const filters = {
        type: req.query.type as any,
        transactionType: req.query.transactionType as any,
        status: req.query.status as any,
        minPrice: req.query.minPrice ? Number(req.query.minPrice) : undefined,
        maxPrice: req.query.maxPrice ? Number(req.query.maxPrice) : undefined,
        minArea: req.query.minArea ? Number(req.query.minArea) : undefined,
        maxArea: req.query.maxArea ? Number(req.query.maxArea) : undefined,
        city: req.query.city as string,
        state: req.query.state as string,
        neighborhood: req.query.neighborhood as string,
        bedrooms: req.query.bedrooms ? Number(req.query.bedrooms) : undefined,
        bathrooms: req.query.bathrooms ? Number(req.query.bathrooms) : undefined,
        parkingSpaces: req.query.parkingSpaces ? Number(req.query.parkingSpaces) : undefined,
        agency: req.query.agency as string,
      };

      const properties = await propertiesService.findAll(req.user!, filters);
      return res.json(properties);
    } catch (error) {
      next(error);
    }
  },
);

/**
 * GET /properties/:id
 * Buscar imóvel por ID (todos os roles)
 */
propertiesRouter.get(
  '/:id',
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const property = await propertiesService.findOne(req.params.id, req.user!);
      return res.json(property);
    } catch (error) {
      next(error);
    }
  },
);

/**
 * PATCH /properties/:id
 * Atualizar imóvel (Manager/Admin)
 */
propertiesRouter.patch(
  '/:id',
  rbacMiddleware([UserRole.ADMIN, UserRole.MANAGER]),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const property = await propertiesService.update(req.params.id, req.body, req.user!);
      logger.info(`Imóvel atualizado: ${property._id} por ${req.user!.email}`);
      return res.json(property);
    } catch (error) {
      next(error);
    }
  },
);

/**
 * DELETE /properties/:id
 * Deletar imóvel (soft delete) (Manager/Admin)
 */
propertiesRouter.delete(
  '/:id',
  rbacMiddleware([UserRole.ADMIN, UserRole.MANAGER]),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      await propertiesService.remove(req.params.id, req.user!);
      logger.info(`Imóvel deletado: ${req.params.id} por ${req.user!.email}`);
      return res.status(204).send();
    } catch (error) {
      next(error);
    }
  },
);

/**
 * POST /properties/search/recommended
 * Buscar imóveis recomendados (usado por agentes de IA)
 */
propertiesRouter.post(
  '/search/recommended',
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { preferences, limit } = req.body;
      const agencyId = req.user!.agencyId;

      if (!agencyId) {
        return res.status(400).json({ error: 'Usuário não possui agência associada' });
      }

      const properties = await propertiesService.findRecommended(preferences, agencyId, limit || 5);
      return res.json(properties);
    } catch (error) {
      next(error);
    }
  },
);

/**
 * POST /properties/:id/photos
 * Adicionar foto ao imóvel (Manager/Admin)
 */
propertiesRouter.post(
  '/:id/photos',
  rbacMiddleware([UserRole.ADMIN, UserRole.MANAGER]),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { photoUrl } = req.body;

      if (!photoUrl) {
        return res.status(400).json({ error: 'Campo "photoUrl" é obrigatório' });
      }

      const property = await propertiesService.addPhoto(req.params.id, photoUrl, req.user!);
      logger.info(`Foto adicionada ao imóvel ${property._id} por ${req.user!.email}`);
      return res.json(property);
    } catch (error) {
      next(error);
    }
  },
);

/**
 * DELETE /properties/:id/photos
 * Remover foto do imóvel (Manager/Admin)
 */
propertiesRouter.delete(
  '/:id/photos',
  rbacMiddleware([UserRole.ADMIN, UserRole.MANAGER]),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { photoUrl } = req.body;

      if (!photoUrl) {
        return res.status(400).json({ error: 'Campo "photoUrl" é obrigatório' });
      }

      const property = await propertiesService.removePhoto(req.params.id, photoUrl, req.user!);
      logger.info(`Foto removida do imóvel ${property._id} por ${req.user!.email}`);
      return res.json(property);
    } catch (error) {
      next(error);
    }
  },
);
