import { Router, Response, NextFunction } from 'express';
import { agenciesService } from '../services/agencies.service';
import { jwtAuthMiddleware } from '../middleware/jwt-auth.middleware';
import { rbacMiddleware } from '../middleware/rbac.middleware';
import { AuthenticatedRequest } from '../types/auth.types';
import { UserRole } from '../types/roles.enum';
import { Logger } from '../../../config/logger.config';

const logger = new Logger('AgenciesRouter');
const router = Router();

// Aplicar autenticação JWT em todas as rotas
router.use(jwtAuthMiddleware);

/**
 * POST /agencies - Criar nova agência (Admin e Manager)
 */
router.post('/', rbacMiddleware([UserRole.ADMIN, UserRole.MANAGER]), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const agency = await agenciesService.create(req.body, req.user!);
    res.status(201).json(agency);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /agencies - Listar todas as agências (Admin only)
 */
router.get('/', rbacMiddleware([UserRole.ADMIN]), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const agencies = await agenciesService.findAll(req.user!);
    res.json(agencies);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /agencies/my - Listar agências do usuário logado (todas as roles autenticadas)
 */
router.get('/my', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const agencies = await agenciesService.findByUser(req.user!);
    res.json(agencies);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /agencies/:id - Buscar agência por ID (todas as roles, com RBAC no service)
 */
router.get('/:id', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const agency = await agenciesService.findOne(req.params.id, req.user!);
    res.json(agency);
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /agencies/:id - Atualizar agência (Admin e Owner)
 */
router.patch('/:id', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const agency = await agenciesService.update(req.params.id, req.body, req.user!);
    res.json(agency);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /agencies/:agencyId/members/:userId - Adicionar membro à agência (Admin e Owner)
 */
router.post('/:agencyId/members/:userId', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const agency = await agenciesService.addMember(req.params.agencyId, req.params.userId, req.user!);
    res.json(agency);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /agencies/:agencyId/members/:userId - Remover membro da agência (Admin e Owner)
 */
router.delete('/:agencyId/members/:userId', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const agency = await agenciesService.removeMember(req.params.agencyId, req.params.userId, req.user!);
    res.json(agency);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /agencies/:id - Deletar agência (Admin only)
 */
router.delete('/:id', rbacMiddleware([UserRole.ADMIN]), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    await agenciesService.remove(req.params.id, req.user!);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

/**
 * GET /agencies/:id/stats - Obter estatísticas da agência (todas as roles, com RBAC no service)
 */
router.get('/:id/stats', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const stats = await agenciesService.getStats(req.params.id, req.user!);
    res.json(stats);
  } catch (error) {
    next(error);
  }
});

export default router;
