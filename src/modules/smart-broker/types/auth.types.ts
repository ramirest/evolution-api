import { Request } from 'express';
import { UserRole } from './roles.enum';

/**
 * Payload do token JWT (usado internamente para decode)
 */
export interface JwtPayload {
  sub: string; // userId (alias para compatibilidade JWT)
  email: string;
  role: UserRole;
  agencyId?: string;
  iat?: number;
  exp?: number;
}

/**
 * Usuário autenticado (anexado em req.user pelos middlewares)
 * Compatível com JwtPayload para facilitar uso nos services
 */
export interface AuthenticatedUser {
  sub: string; // userId (mantém compatibilidade)
  userId: string; // Campo principal usado nos services
  email: string;
  name?: string;
  role: UserRole;
  agencyId?: string;
}

/**
 * Request Express customizado com usuário autenticado
 */
export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}
