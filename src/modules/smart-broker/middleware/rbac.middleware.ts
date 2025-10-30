import { Response, NextFunction } from 'express';
import { Logger } from '@config/logger.config';
import { ForbiddenException } from '@exceptions';
import { AuthenticatedRequest } from '../types/auth.types';
import { UserRole } from '../types/roles.enum';

const logger = new Logger('RbacMiddleware');

/**
 * Middleware para verificar roles (RBAC)
 * @param allowedRoles - Array de roles permitidos
 */
export function rbacMiddleware(allowedRoles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      // Verificar se o usuário está autenticado
      if (!req.user) {
        throw new ForbiddenException('User not authenticated');
      }

      // Verificar se o role do usuário está na lista de permitidos
      if (!allowedRoles.includes(req.user.role as UserRole)) {
        logger.warn(
          `Access denied for user ${req.user.email} (${req.user.role}) - Required: ${allowedRoles.join(', ')}`
        );
        throw new ForbiddenException(
          `Access denied. Required role: ${allowedRoles.join(' or ')}`
        );
      }

      logger.log(`Access granted for ${req.user.email} (${req.user.role})`);
      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Middleware para verificar permissions granulares
 * @param requiredPermission - Permission necessária (ex: 'properties:create')
 */
export function rbacPermissionMiddleware(requiredPermission: string) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ForbiddenException('User not authenticated');
      }

      // ADMIN tem todas as permissões
      if (req.user.role === UserRole.ADMIN) {
        return next();
      }

      // TODO: Implementar lógica de permissions granulares
      // Por enquanto, mapear role -> permissions básicas
      const [resource, action] = requiredPermission.split(':');

      const rolePermissions: Record<UserRole, string[]> = {
        [UserRole.ADMIN]: ['*'], // Todas
        [UserRole.MANAGER]: [
          'properties:*',
          'contacts:*',
          'campaigns:*',
          'users:read',
          'agencies:read',
        ],
        [UserRole.AGENT]: [
          'properties:read',
          'contacts:read',
          'contacts:create',
          'campaigns:read',
        ],
        [UserRole.VIEWER]: [
          'properties:read',
          'contacts:read',
          'campaigns:read',
        ],
      };

      const userPermissions = rolePermissions[req.user.role as UserRole] || [];

      // Verificar se tem permissão específica ou wildcard
      const hasPermission =
        userPermissions.includes(requiredPermission) ||
        userPermissions.includes(`${resource}:*`) ||
        userPermissions.includes('*');

      if (!hasPermission) {
        logger.warn(
          `Permission denied for user ${req.user.email} - Required: ${requiredPermission}`
        );
        throw new ForbiddenException(
          `Access denied. Missing permission: ${requiredPermission}`
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Middleware para verificar se o usuário pertence à agência correta
 * (Multi-tenancy enforcement)
 */
export function agencyScopeMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    if (!req.user) {
      throw new ForbiddenException('User not authenticated');
    }

    // ADMIN pode acessar qualquer agência
    if (req.user.role === UserRole.ADMIN) {
      return next();
    }

    // Verificar se o usuário tem agencyId
    if (!req.user.agencyId) {
      throw new ForbiddenException('User not associated with any agency');
    }

    // O service layer deve filtrar dados por agencyId
    // Este middleware apenas garante que o campo existe
    next();
  } catch (error) {
    next(error);
  }
}
