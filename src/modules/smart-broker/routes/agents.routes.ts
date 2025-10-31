import { Router, Response, NextFunction } from 'express';
import { agentsService, AgentType } from '../services/agents.service';
import { jwtAuthMiddleware } from '../middleware/jwt-auth.middleware';
import { AuthenticatedRequest } from '../types/auth.types';
import { Logger } from '../../../config/logger.config';

const logger = new Logger('AgentsRouter');
const router = Router();

// Aplicar autenticação JWT em todas as rotas
router.use(jwtAuthMiddleware);

/**
 * POST /agents/execute-goal - Executar objetivo (criar nova sessão)
 */
router.post('/execute-goal', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { goal, agentType = AgentType.GENERAL_ASSISTANT, context } = req.body;

    if (!goal) {
      return res.status(400).json({ error: 'Campo "goal" é obrigatório' });
    }

    const session = await agentsService.executeGoal(
      {
        goal,
        agentType,
        context,
      },
      req.user!
    );

    logger.info(`Sessão de agente criada: ${session._id} por ${req.user!.email}`);
    
    return res.status(201).json(session);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /agents/chat - Continuar conversa em sessão existente
 */
router.post('/chat', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { sessionId, message, contactId } = req.body;

    if (!sessionId || !message) {
      return res.status(400).json({ error: 'Campos "sessionId" e "message" são obrigatórios' });
    }

    const session = await agentsService.chat(
      {
        sessionId,
        message,
        contactId,
      },
      req.user!
    );

    logger.info(`Mensagem adicionada à sessão ${sessionId}`);
    
    return res.json(session);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /agents/sessions - Listar sessões do usuário
 */
router.get('/sessions', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const filters: any = {};

    if (req.query.status) {
      filters.status = req.query.status;
    }

    const sessions = await agentsService.findSessions(req.user!, filters);
    
    return res.json(sessions);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /agents/sessions/:id - Buscar sessão por ID
 */
router.get('/sessions/:id', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const session = await agentsService.findSession(req.params.id, req.user!);
    
    return res.json(session);
  } catch (error) {
    next(error);
  }
});

export default router;
