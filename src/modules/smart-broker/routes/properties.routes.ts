import { Router, Response, NextFunction } from 'express';
import { propertiesService } from '../services/properties.service';
import { jwtAuthMiddleware } from '../middleware/jwt-auth.middleware';
import { rbacMiddleware } from '../middleware/rbac.middleware';
import { AuthenticatedRequest } from '../types/auth.types';
import { UserRole } from '../types/roles.enum';
import { Logger } from '../../../config/logger.config';

const logger = new Logger('PropertiesRouter');

export const propertiesRouter = Router();

// Todos os endpoints exigem autenticação
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
