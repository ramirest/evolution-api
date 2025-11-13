import { Router, Response, NextFunction } from 'express';
import { settingsService, UpdateIntegrationsDto } from '../services/settings.service';
import { jwtAuthMiddleware } from '../middleware/jwt-auth.middleware';
import { AuthenticatedRequest } from '../types/auth.types';
import { Logger } from '../../../config/logger.config';

const logger = new Logger('SettingsRouter');

export const settingsRouter = Router();

// Todas as rotas exigem autenticação
settingsRouter.use(jwtAuthMiddleware);

/**
 * GET /settings/integrations
 * Buscar configurações de integrações da agência
 */
settingsRouter.get(
  '/integrations',
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const settings = await settingsService.getByAgency(req.user!);
      
      // Retornar sem as API keys descriptografadas (segurança)
      return res.json({
        ai: {
          ...settings.integrations.ai,
          apiKey: settings.integrations.ai.apiKey ? '***' : '',
        },
        email: {
          ...settings.integrations.email,
          smtpPass: settings.integrations.email.smtpPass ? '***' : '',
          apiKey: settings.integrations.email.apiKey ? '***' : '',
        },
        sms: {
          ...settings.integrations.sms,
          authToken: settings.integrations.sms.authToken ? '***' : '',
          apiKey: settings.integrations.sms.apiKey ? '***' : '',
          apiSecret: settings.integrations.sms.apiSecret ? '***' : '',
        },
        analytics: {
          ...settings.integrations.analytics,
          apiKey: settings.integrations.analytics.apiKey ? '***' : '',
        },
        upload: settings.integrations.upload,
      });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * PUT /settings/integrations
 * Atualizar configurações de integrações
 */
settingsRouter.put(
  '/integrations',
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const updates: UpdateIntegrationsDto = req.body;
      
      const settings = await settingsService.updateIntegrations(req.user!, updates);
      
      logger.info(`Configurações atualizadas por ${req.user!.email}`);
      
      // Retornar sem as API keys descriptografadas
      return res.json({
        message: 'Configurações atualizadas com sucesso',
        ai: {
          ...settings.integrations.ai,
          apiKey: settings.integrations.ai.apiKey ? '***' : '',
        },
        email: {
          ...settings.integrations.email,
          smtpPass: settings.integrations.email.smtpPass ? '***' : '',
          apiKey: settings.integrations.email.apiKey ? '***' : '',
        },
        sms: {
          ...settings.integrations.sms,
          authToken: settings.integrations.sms.authToken ? '***' : '',
          apiKey: settings.integrations.sms.apiKey ? '***' : '',
          apiSecret: settings.integrations.sms.apiSecret ? '***' : '',
        },
        analytics: {
          ...settings.integrations.analytics,
          apiKey: settings.integrations.analytics.apiKey ? '***' : '',
        },
        upload: settings.integrations.upload,
      });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * POST /settings/integrations/test
 * Testar conexão de uma integração
 */
settingsRouter.post(
  '/integrations/test',
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { type } = req.body;
      
      if (!type || !['ai', 'email', 'sms', 'analytics', 'upload'].includes(type)) {
        return res.status(400).json({ error: 'Tipo de integração inválido' });
      }
      
      const result = await settingsService.testIntegration(req.user!, type);
      
      return res.json(result);
    } catch (error) {
      next(error);
    }
  },
);

export default settingsRouter;
