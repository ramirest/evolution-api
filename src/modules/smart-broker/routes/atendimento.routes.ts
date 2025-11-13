import { Router, Response, NextFunction } from 'express';
import { atendimentoService } from '../services/atendimento.service';
import { jwtAuthMiddleware } from '../middleware/jwt-auth.middleware';
import { AuthenticatedRequest } from '../types/auth.types';
import { Logger } from '../../../config/logger.config';
import { AtendimentoStatus } from '../models/atendimento-session.model';

const logger = new Logger('AtendimentoRouter');

export const atendimentoRouter = Router();

// Todos os endpoints exigem autenticação
atendimentoRouter.use(jwtAuthMiddleware);

/**
 * GET /atendimento/sessions
 * Listar sessões de atendimento da agência
 */
atendimentoRouter.get(
  '/sessions',
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const filters: any = {};
      
      if (req.query.status) {
        filters.status = req.query.status as AtendimentoStatus;
      }
      
      if (req.query.assignedTo) {
        filters.assignedTo = req.query.assignedTo as string;
      }

      const sessions = await atendimentoService.findByAgency(req.user!, filters);
      return res.json(sessions);
    } catch (error) {
      next(error);
    }
  },
);

/**
 * GET /atendimento/sessions/:id
 * Buscar sessão por ID
 */
atendimentoRouter.get(
  '/sessions/:id',
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const session = await atendimentoService.findOne(req.params.id, req.user!);
      return res.json(session);
    } catch (error) {
      next(error);
    }
  },
);

/**
 * POST /atendimento/sessions/:id/assume
 * Corretor assume a sessão (handoff)
 */
atendimentoRouter.post(
  '/sessions/:id/assume',
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const session = await atendimentoService.assumeSession(req.params.id, req.user!);
      logger.info(`Sessão ${req.params.id} assumida por ${req.user!.email}`);
      return res.json(session);
    } catch (error) {
      next(error);
    }
  },
);

/**
 * POST /atendimento/sessions/:id/messages
 * Corretor envia mensagem
 */
atendimentoRouter.post(
  '/sessions/:id/messages',
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { message } = req.body;
      
      if (!message) {
        return res.status(400).json({ error: 'Campo "message" é obrigatório' });
      }

      const session = await atendimentoService.sendMessage(req.params.id, message, req.user!);
      return res.json(session);
    } catch (error) {
      next(error);
    }
  },
);

/**
 * POST /atendimento/sessions/:id/close
 * Encerrar sessão
 */
atendimentoRouter.post(
  '/sessions/:id/close',
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const session = await atendimentoService.closeSession(req.params.id, req.user!);
      logger.info(`Sessão ${req.params.id} encerrada por ${req.user!.email}`);
      return res.json(session);
    } catch (error) {
      next(error);
    }
  },
);
