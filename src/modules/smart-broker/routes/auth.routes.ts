import { Router, Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';
import { validationMiddleware } from '../middleware/validation.middleware';
import { jwtAuthMiddleware } from '../middleware/jwt-auth.middleware';
import { Logger } from '../../../config/logger.config';

const logger = new Logger('AuthRouter');

export const authRouter = Router();

// DTOs de validação (classes simples com decorators class-validator)
class LoginDto {
  email: string;
  password: string;
}

class RegisterDto {
  email: string;
  password: string;
  name: string;
  phone?: string;
}

/**
 * POST /auth/login
 * Endpoint público - faz login e retorna token JWT
 */
authRouter.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email e senha são obrigatórios' });
    }

    const result = await authService.login({ email, password });
    
    logger.info(`Usuário ${email} fez login com sucesso`);
    return res.json(result);
  } catch (error) {
    logger.error(`Erro no login: ${error.message}`);
    next(error);
  }
});

/**
 * POST /auth/register
 * Endpoint público - registra novo usuário
 */
authRouter.post('/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, name, phone, role } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, senha e nome são obrigatórios' });
    }

    const result = await authService.register({ email, password, name, phone, role });
    
    logger.info(`Novo usuário registrado: ${email} (role: ${role || 'viewer'})`);
    return res.status(201).json(result); // Status 201 Created
  } catch (error) {
    logger.error(`Erro no registro: ${error.message}`);
    next(error);
  }
});

/**
 * GET /auth/me
 * Endpoint protegido - retorna dados do usuário logado
 */
authRouter.get('/me', jwtAuthMiddleware, async (req: any, res: Response, next: NextFunction) => {
  try {
    const user = req.user;
    
    return res.json({
      id: user.userId,
      email: user.email,
      role: user.role,
      agencyId: user.agencyId,
    });
  } catch (error) {
    logger.error(`Erro ao buscar dados do usuário: ${error.message}`);
    next(error);
  }
});

/**
 * GET /auth/profile
 * Endpoint protegido - alias para /auth/me (compatibilidade com frontend)
 * Retorna dados completos do usuário logado
 */
authRouter.get('/profile', jwtAuthMiddleware, async (req: any, res: Response, next: NextFunction) => {
  try {
    const user = req.user;
    
    // Buscar dados completos do usuário no banco
    const fullUserData = await authService.getUserById(user.userId);
    
    return res.json(fullUserData);
  } catch (error) {
    logger.error(`Erro ao buscar perfil do usuário: ${error.message}`);
    next(error);
  }
});

/**
 * POST /auth/refresh
 * Endpoint protegido - renova o token JWT
 */
authRouter.post('/refresh', jwtAuthMiddleware, async (req: any, res: Response, next: NextFunction) => {
  try {
    const userId = req.user.userId;
    
    const result = await authService.refreshToken(userId);
    
    logger.info(`Token renovado para usuário ${userId}`);
    return res.json(result);
  } catch (error) {
    logger.error(`Erro ao renovar token: ${error.message}`);
    next(error);
  }
});

/**
 * POST /auth/logout
 * Endpoint protegido - logout do usuário (cliente deve descartar token)
 */
authRouter.post('/logout', jwtAuthMiddleware, async (req: any, res: Response, next: NextFunction) => {
  try {
    // Em JWT stateless, logout é feito no cliente (descartando o token)
    // Aqui podemos adicionar o token a uma blacklist se necessário
    
    logger.info(`Usuário ${req.user.email} fez logout`);
    return res.json({ message: 'Logout realizado com sucesso' });
  } catch (error) {
    logger.error(`Erro no logout: ${error.message}`);
    next(error);
  }
});
