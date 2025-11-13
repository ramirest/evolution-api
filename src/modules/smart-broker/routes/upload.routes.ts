import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { cloudUploadService } from '../services/cloud-upload.service';
import { jwtAuthMiddleware } from '../middleware/jwt-auth.middleware';
import { AuthenticatedRequest } from '../types/auth.types';

// Configurar Multer para usar memória (buffer)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});

const uploadRouter = Router();

/**
 * POST /upload/cloud
 * Upload de arquivo para o provider configurado (S3, Cloudinary, etc.)
 * Requer autenticação JWT
 */
uploadRouter.post(
  '/cloud',
  jwtAuthMiddleware,
  upload.single('file'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const file = req.file;
      if (!file) {
        return res.status(400).json({ error: 'No file provided' });
      }

      if (!file.buffer || file.buffer.length === 0) {
        return res.status(400).json({ error: 'File buffer is empty' });
      }

      const agencyId = req.user?.agencyId;
      if (!agencyId) {
        return res.status(401).json({ error: 'Agency ID not found in token' });
      }

      const folder = req.body.folder || 'uploads';

      console.log('[Upload] Processing file:', {
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        agencyId,
        folder,
      });

      const result = await cloudUploadService.uploadFile(agencyId, file, folder);

      return res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      console.error('[Upload] Error:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to upload file',
      });
    }
  }
);

/**
 * POST /upload/cloud/test
 * Testar conexão com o provider de upload configurado
 */
uploadRouter.post(
  '/cloud/test',
  jwtAuthMiddleware,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const agencyId = req.user?.agencyId;
      if (!agencyId) {
        return res.status(401).json({ error: 'Agency ID not found in token' });
      }

      const isConnected = await cloudUploadService.testConnection(agencyId);

      return res.status(200).json({
        success: isConnected,
        message: isConnected ? 'Connection successful' : 'Connection failed',
      });
    } catch (error: any) {
      console.error('[Upload] Connection test error:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to test connection',
      });
    }
  }
);

/**
 * DELETE /upload/cloud
 * Deletar arquivo do provider configurado
 */
uploadRouter.delete(
  '/cloud',
  jwtAuthMiddleware,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { fileUrl } = req.body;
      if (!fileUrl) {
        return res.status(400).json({ error: 'File URL is required' });
      }

      const agencyId = req.user?.agencyId;
      if (!agencyId) {
        return res.status(401).json({ error: 'Agency ID not found in token' });
      }

      await cloudUploadService.deleteFile(agencyId, fileUrl);

      return res.status(200).json({
        success: true,
        message: 'File deleted successfully',
      });
    } catch (error: any) {
      console.error('[Upload] Delete error:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to delete file',
      });
    }
  }
);

export { uploadRouter };
