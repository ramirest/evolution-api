import { Router, Response, NextFunction } from 'express';
import { contactsService } from '../services/contacts.service';
import { jwtAuthMiddleware } from '../middleware/jwt-auth.middleware';
import { rbacMiddleware } from '../middleware/rbac.middleware';
import { AuthenticatedRequest } from '../types/auth.types';
import { UserRole } from '../types/roles.enum';
import { Logger } from '../../../config/logger.config';

const logger = new Logger('ContactsRouter');

export const contactsRouter = Router();

// Todos os endpoints exigem autenticação
contactsRouter.use(jwtAuthMiddleware);

/**
 * POST /contacts
 * Criar novo contato (Manager/Agent/Admin)
 */
contactsRouter.post(
  '/',
  rbacMiddleware([UserRole.ADMIN, UserRole.MANAGER, UserRole.AGENT]),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const contact = await contactsService.create(req.body, req.user!);
      logger.info(`Contato criado: ${contact._id} por ${req.user!.email}`);
      return res.status(201).json(contact);
    } catch (error) {
      next(error);
    }
  },
);

/**
 * GET /contacts
 * Listar contatos com filtros (todos os roles)
 */
contactsRouter.get(
  '/',
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const filters = {
        status: req.query.status as any,
        origin: req.query.origin as any,
        agency: req.query.agency as string,
        assignedTo: req.query.assignedTo as string,
        tags: req.query.tags ? (req.query.tags as string).split(',') : undefined,
        urgency: req.query.urgency as string,
      };

      const contacts = await contactsService.findAll(req.user!, filters);
      return res.json(contacts);
    } catch (error) {
      next(error);
    }
  },
);

/**
 * GET /contacts/:id
 * Buscar contato por ID (todos os roles)
 */
contactsRouter.get(
  '/:id',
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const contact = await contactsService.findOne(req.params.id, req.user!);
      return res.json(contact);
    } catch (error) {
      next(error);
    }
  },
);

/**
 * PATCH /contacts/:id
 * Atualizar contato (Manager/Agent/Admin)
 */
contactsRouter.patch(
  '/:id',
  rbacMiddleware([UserRole.ADMIN, UserRole.MANAGER, UserRole.AGENT]),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const contact = await contactsService.update(req.params.id, req.body, req.user!);
      logger.info(`Contato atualizado: ${contact._id} por ${req.user!.email}`);
      return res.json(contact);
    } catch (error) {
      next(error);
    }
  },
);

/**
 * DELETE /contacts/:id
 * Deletar contato (soft delete) (Manager/Admin)
 */
contactsRouter.delete(
  '/:id',
  rbacMiddleware([UserRole.ADMIN, UserRole.MANAGER]),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      await contactsService.remove(req.params.id, req.user!);
      logger.info(`Contato deletado: ${req.params.id} por ${req.user!.email}`);
      return res.status(204).send();
    } catch (error) {
      next(error);
    }
  },
);

/**
 * POST /contacts/:id/interactions
 * Adicionar interação ao histórico do contato (Manager/Agent/Admin)
 */
contactsRouter.post(
  '/:id/interactions',
  rbacMiddleware([UserRole.ADMIN, UserRole.MANAGER, UserRole.AGENT]),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const contact = await contactsService.addInteraction(req.params.id, req.body, req.user!);
      logger.info(`Interação adicionada ao contato: ${contact._id}`);
      return res.json(contact);
    } catch (error) {
      next(error);
    }
  },
);

/**
 * POST /contacts/:id/send-whatsapp
 * Enviar mensagem WhatsApp para contato (Manager/Agent/Admin)
 */
contactsRouter.post(
  '/:id/send-whatsapp',
  rbacMiddleware([UserRole.ADMIN, UserRole.MANAGER, UserRole.AGENT]),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { message, evolutionInstanceId } = req.body;

      if (!message || !evolutionInstanceId) {
        return res.status(400).json({ error: 'message e evolutionInstanceId são obrigatórios' });
      }

      const result = await contactsService.sendWhatsappMessage(
        req.params.id,
        message,
        evolutionInstanceId,
        req.user!,
      );

      logger.info(`Mensagem WhatsApp enviada para contato ${req.params.id}`);
      return res.json(result);
    } catch (error) {
      next(error);
    }
  },
);

/**
 * GET /contacts/search/by-phone
 * Buscar contato por telefone (usado por webhooks)
 */
contactsRouter.get(
  '/search/by-phone',
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { phone, agencyId } = req.query;

      if (!phone) {
        return res.status(400).json({ error: 'phone é obrigatório' });
      }

      const contact = await contactsService.findByPhone(phone as string, agencyId as string);
      return res.json(contact);
    } catch (error) {
      next(error);
    }
  },
);
