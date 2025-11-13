import { Router, Response, NextFunction } from 'express';
import multer from 'multer';
import { agentsService, AgentType } from '../services/agents.service';
import { jwtAuthMiddleware } from '../middleware/jwt-auth.middleware';
import { AuthenticatedRequest } from '../types/auth.types';
import { cloudUploadService } from '../services/cloud-upload.service';
import { Logger } from '../../../config/logger.config';

const logger = new Logger('AgentsRouter');
const router = Router();

// Configurar Multer para upload de arquivos no chat
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB por arquivo
    files: 10, // Máximo 10 arquivos por request
  },
});

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
 * Agora aceita arquivos (multipart/form-data) para upload de imagens
 */
router.post('/chat', upload.array('files', 10), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { sessionId, message, contactId } = req.body;

    if (!sessionId || !message) {
      return res.status(400).json({ error: 'Campos "sessionId" e "message" são obrigatórios' });
    }

    // Processar arquivos anexados (se houver)
    const files = (req as any).files || [];
    const uploadedImageUrls: string[] = [];
    const rejectedFiles: Array<{ name: string; reason: string }> = [];

    if (files && files.length > 0) {
      logger.info(`[AgentsRouter] Processando ${files.length} arquivo(s) anexado(s)`);

      for (const file of files) {
        // Validar se é uma imagem
        if (!file.mimetype.startsWith('image/')) {
          rejectedFiles.push({
            name: file.originalname,
            reason: 'Apenas imagens são aceitas para anexo em imóveis',
          });
          logger.warn(`[AgentsRouter] Arquivo rejeitado (não é imagem): ${file.originalname} (${file.mimetype})`);
          continue;
        }

        // Fazer upload da imagem
        try {
          const agencyId = req.user!.agencyId;
          if (!agencyId) {
            throw new Error('Usuário não possui agência associada');
          }

          const uploadResult = await cloudUploadService.uploadFile(agencyId, file, 'properties');
          uploadedImageUrls.push(uploadResult.publicUrl);
          logger.info(`[AgentsRouter] Imagem enviada com sucesso: ${file.originalname} -> ${uploadResult.publicUrl}`);
        } catch (uploadError: any) {
          rejectedFiles.push({
            name: file.originalname,
            reason: `Erro no upload: ${uploadError.message}`,
          });
          logger.error(`[AgentsRouter] Erro ao fazer upload de ${file.originalname}: ${uploadError.message}`);
        }
      }
    }

    // Chamar o serviço do agente (passando as URLs das imagens)
    const session = await agentsService.chat(
      {
        sessionId,
        message,
        contactId,
        uploadedImageUrls: uploadedImageUrls.length > 0 ? uploadedImageUrls : undefined,
        rejectedFiles: rejectedFiles.length > 0 ? rejectedFiles : undefined,
      },
      req.user!
    );

    logger.info(`Mensagem adicionada à sessão ${sessionId}`);
    
    return res.json({ session });
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

/**
 * PATCH /agents/sessions/:id - Atualizar sessão (renomear, arquivar, etc)
 */
router.patch('/sessions/:id', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { title, status } = req.body;
    
    const session = await agentsService.updateSession(
      req.params.id,
      { title, status },
      req.user!
    );
    
    logger.info(`Sessão ${req.params.id} atualizada por ${req.user!.email}`);
    
    return res.json(session);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /agents/sessions/:id - Deletar sessão
 */
router.delete('/sessions/:id', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    await agentsService.deleteSession(req.params.id, req.user!);
    
    logger.info(`Sessão ${req.params.id} deletada por ${req.user!.email}`);
    
    return res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
