import { Router, Response, NextFunction } from 'express';
import { campaignsService } from '../services/campaigns.service';
import { jwtAuthMiddleware } from '../middleware/jwt-auth.middleware';
import { rbacMiddleware } from '../middleware/rbac.middleware';
import { AuthenticatedRequest } from '../types/auth.types';
import { UserRole } from '../types/roles.enum';
import { Logger } from '../../../config/logger.config';

const logger = new Logger('CampaignsRouter');
const router = Router();

// Aplicar autenticação JWT em todas as rotas
router.use(jwtAuthMiddleware);

/**
 * POST /campaigns - Criar nova campanha (Admin e Manager)
 */
router.post('/', rbacMiddleware([UserRole.ADMIN, UserRole.MANAGER]), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const campaign = await campaignsService.create(req.body, req.user!);
    res.status(201).json(campaign);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /campaigns - Listar campanhas com filtros (todas as roles, com RBAC no service)
 */
router.get('/', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const filters = {
      agency: req.query.agency as string | undefined,
      status: req.query.status as any,
      type: req.query.type as any,
    };
    const campaigns = await campaignsService.findAll(req.user!, filters);
    res.json(campaigns);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /campaigns/:id - Buscar campanha por ID (todas as roles, com RBAC no service)
 */
router.get('/:id', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const campaign = await campaignsService.findOne(req.params.id, req.user!);
    res.json(campaign);
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /campaigns/:id - Atualizar campanha (Admin e Manager)
 */
router.patch('/:id', rbacMiddleware([UserRole.ADMIN, UserRole.MANAGER]), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const campaign = await campaignsService.update(req.params.id, req.body, req.user!);
    res.json(campaign);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /campaigns/:id/execute - Executar campanha (Admin e Manager)
 */
router.post('/:id/execute', rbacMiddleware([UserRole.ADMIN, UserRole.MANAGER]), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const result = await campaignsService.execute(req.params.id, req.user!);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /campaigns/:id - Deletar campanha (Admin e Manager)
 */
router.delete('/:id', rbacMiddleware([UserRole.ADMIN, UserRole.MANAGER]), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    await campaignsService.remove(req.params.id, req.user!);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
