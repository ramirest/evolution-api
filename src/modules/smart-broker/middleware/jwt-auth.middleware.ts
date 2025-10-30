import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Logger } from '@config/logger.config';
import { UnauthorizedException } from '@exceptions';
import { AuthenticatedRequest, JwtPayload } from '../types/auth.types';
import { jwtConfig } from '../config/jwt.config';

const logger = new Logger('JwtAuthMiddleware');

// Rotas públicas que não precisam de autenticação
const PUBLIC_ROUTES = [
  '/auth/login',
  '/auth/register',
  '/health',
  '/metrics',
];

function isPublicRoute(path: string): boolean {
  return PUBLIC_ROUTES.some(route => path.startsWith(route));
}

export function jwtAuthMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    // Permitir rotas públicas
    if (isPublicRoute(req.path)) {
      return next();
    }

    // Verificar se o header Authorization existe
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Token missing or malformed');
    }

    // Extrair o token
    const token = authHeader.substring(7);

    // Verificar e decodificar o token
    const decoded = jwt.verify(token, jwtConfig.secret) as JwtPayload;

    // Anexar informações do usuário na request
    req.user = {
      userId: decoded.sub,
      email: decoded.email,
      role: decoded.role,
      agencyId: decoded.agencyId,
    };

    logger.log(`User authenticated: ${decoded.email} (${decoded.role})`);
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      logger.error('Token expired');
      throw new UnauthorizedException('Token expired. Please login again.');
    }
    if (error.name === 'JsonWebTokenError') {
      logger.error(`Invalid token: ${error.message}`);
      throw new UnauthorizedException('Invalid token');
    }
    logger.error(`JWT authentication error: ${error.message}`);
    throw new UnauthorizedException('Authentication failed');
  }
}

// Middleware opcional para marcar rotas como públicas
export function publicRoute(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  // Flag para indicar que a rota é pública
  (req as any).isPublic = true;
  next();
}
