import { Router, Response, NextFunction } from 'express';
import { jwtAuthMiddleware } from '../middleware/jwt-auth.middleware';
import { AuthenticatedRequest } from '../types/auth.types';
import { rbacMiddleware } from '../middleware/rbac.middleware';
import { UserRole } from '../types/roles.enum';
import { InstancesRepository } from '../repositories/instances.repository';
import { evolutionApiService } from '../services/evolution-api.service';

const router = Router();
const instancesRepo = new InstancesRepository();

/**
 * ==================== ROTAS DE INSTÂNCIAS WHATSAPP ====================
 * Todas as rotas aplicam RBAC e filtram por agência
 */

/**
 * GET /smart-broker/whatsapp/instances
 * Listar todas as instâncias da agência do usuário logado
 * Permissões: Todos os usuários autenticados
 */
router.get(
  '/instances',
  jwtAuthMiddleware,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user;

      // Buscar instâncias da agência no MongoDB
      const agencyInstances = await instancesRepo.findByAgency(user.agencyId);
      const agencyInstanceNames = agencyInstances.map((i) => i.instanceName);

      // Buscar dados atualizados da Evolution API
      const allInstances = await evolutionApiService.listAllInstances();

      // Filtrar apenas instâncias da agência
      const filteredInstances = allInstances.filter((instance) =>
        agencyInstanceNames.includes(instance.instanceName || instance.instance)
      );

      // Enriquecer com dados do MongoDB
      const enrichedInstances = filteredInstances.map((evolutionInstance) => {
        const dbInstance = agencyInstances.find(
          (i) => i.instanceName === (evolutionInstance.instanceName || evolutionInstance.instance)
        );
        return {
          ...evolutionInstance,
          agencyId: dbInstance?.agencyId,
          createdBy: dbInstance?.createdBy,
          webhookUrl: dbInstance?.webhookUrl,
        };
      });

      res.json(enrichedInstances);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /smart-broker/whatsapp/instances
 * Criar nova instância e associar à agência
 * Permissões: Admin, Manager
 */
router.post(
  '/instances',
  jwtAuthMiddleware,
  rbacMiddleware([UserRole.ADMIN, UserRole.MANAGER]),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user;
      const { instanceName, token, number, webhookUrl, qrcode } = req.body;

      // Validação
      if (!instanceName || typeof instanceName !== 'string') {
        return res.status(400).json({ message: 'instanceName é obrigatório' });
      }

      // Verificar se já existe no MongoDB
      const existingInstance = await instancesRepo.findByName(instanceName);
      if (existingInstance) {
        return res.status(409).json({ message: 'Instância já existe' });
      }

      // Criar na Evolution API
      const evolutionInstance = await evolutionApiService.createInstance({
        instanceName,
        token,
        number,
        qrcode,
        webhook: webhookUrl,
      });

      // Salvar no MongoDB (associar à agência)
      const dbInstance = await instancesRepo.create({
        instanceName,
        agencyId: user.agencyId,
        createdBy: user.userId,
        webhookUrl,
      });

      res.status(201).json({
        ...evolutionInstance,
        agencyId: dbInstance.agencyId,
        createdBy: dbInstance.createdBy,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /smart-broker/whatsapp/instances/:name
 * Obter detalhes de uma instância específica
 * Permissões: Todos os usuários autenticados (se pertence à agência)
 */
router.get(
  '/instances/:name',
  jwtAuthMiddleware,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user;
      const { name } = req.params;

      // Verificar se instância pertence à agência
      const belongsToAgency = await instancesRepo.belongsToAgency(name, user.agencyId);
      if (!belongsToAgency) {
        return res.status(403).json({ message: 'Instância não pertence à sua agência' });
      }

      // Buscar dados atualizados da Evolution API
      const allInstances = await evolutionApiService.listAllInstances();
      const instance = allInstances.find((i) => i.instanceName === name || i.instance === name);

      if (!instance) {
        return res.status(404).json({ message: 'Instância não encontrada' });
      }

      // Enriquecer com dados do MongoDB
      const dbInstance = await instancesRepo.findByName(name);
      res.json({
        ...instance,
        agencyId: dbInstance?.agencyId,
        createdBy: dbInstance?.createdBy,
        webhookUrl: dbInstance?.webhookUrl,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /smart-broker/whatsapp/instances/:name
 * Deletar instância
 * Permissões: Admin, Manager
 */
router.delete(
  '/instances/:name',
  jwtAuthMiddleware,
  rbacMiddleware([UserRole.ADMIN, UserRole.MANAGER]),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user;
      const { name } = req.params;

      // Verificar se instância pertence à agência
      const belongsToAgency = await instancesRepo.belongsToAgency(name, user.agencyId);
      if (!belongsToAgency) {
        return res.status(403).json({ message: 'Instância não pertence à sua agência' });
      }

      // Deletar da Evolution API
      await evolutionApiService.deleteInstance(name);

      // Deletar do MongoDB (soft delete)
      await instancesRepo.delete(name);

      res.json({ message: 'Instância deletada com sucesso' });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /smart-broker/whatsapp/instances/:name/connect
 * Conectar instância (gerar QR Code)
 * Permissões: Admin, Manager, Agent
 */
router.post(
  '/instances/:name/connect',
  jwtAuthMiddleware,
  rbacMiddleware([UserRole.ADMIN, UserRole.MANAGER, UserRole.AGENT]),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user;
      const { name } = req.params;

      // Verificar se instância pertence à agência
      const belongsToAgency = await instancesRepo.belongsToAgency(name, user.agencyId);
      if (!belongsToAgency) {
        return res.status(403).json({ message: 'Instância não pertence à sua agência' });
      }

      // Conectar via Evolution API
      const result = await evolutionApiService.connectInstance(name);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /smart-broker/whatsapp/instances/:name/disconnect
 * Desconectar instância
 * Permissões: Admin, Manager
 */
router.post(
  '/instances/:name/disconnect',
  jwtAuthMiddleware,
  rbacMiddleware([UserRole.ADMIN, UserRole.MANAGER]),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user;
      const { name } = req.params;

      // Verificar se instância pertence à agência
      const belongsToAgency = await instancesRepo.belongsToAgency(name, user.agencyId);
      if (!belongsToAgency) {
        return res.status(403).json({ message: 'Instância não pertence à sua agência' });
      }

      // Desconectar via Evolution API
      await evolutionApiService.disconnectInstance(name);
      res.json({ message: 'Instância desconectada com sucesso' });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /smart-broker/whatsapp/instances/:name/restart
 * Reiniciar instância
 * Permissões: Admin, Manager
 */
router.put(
  '/instances/:name/restart',
  jwtAuthMiddleware,
  rbacMiddleware([UserRole.ADMIN, UserRole.MANAGER]),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user;
      const { name } = req.params;

      // Verificar se instância pertence à agência
      const belongsToAgency = await instancesRepo.belongsToAgency(name, user.agencyId);
      if (!belongsToAgency) {
        return res.status(403).json({ message: 'Instância não pertence à sua agência' });
      }

      // Reiniciar via Evolution API
      const result = await evolutionApiService.restartInstance(name);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /smart-broker/whatsapp/instances/:name/qrcode
 * Obter QR Code da instância
 * Permissões: Todos os usuários autenticados (se pertence à agência)
 */
router.get(
  '/instances/:name/qrcode',
  jwtAuthMiddleware,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user;
      const { name } = req.params;

      // Verificar se instância pertence à agência
      const belongsToAgency = await instancesRepo.belongsToAgency(name, user.agencyId);
      if (!belongsToAgency) {
        return res.status(403).json({ message: 'Instância não pertence à sua agência' });
      }

      // Buscar QR Code via Evolution API
      const qrCode = await evolutionApiService.getQRCode(name);
      res.json(qrCode);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /smart-broker/whatsapp/instances/:name/status
 * Obter status de conexão da instância
 * Permissões: Todos os usuários autenticados (se pertence à agência)
 */
router.get(
  '/instances/:name/status',
  jwtAuthMiddleware,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user;
      const { name } = req.params;

      // Verificar se instância pertence à agência
      const belongsToAgency = await instancesRepo.belongsToAgency(name, user.agencyId);
      if (!belongsToAgency) {
        return res.status(403).json({ message: 'Instância não pertence à sua agência' });
      }

      // Buscar status via Evolution API
      const status = await evolutionApiService.getConnectionStatus(name);
      res.json(status);
    } catch (error) {
      next(error);
    }
  }
);

export { router as whatsappRouter };
