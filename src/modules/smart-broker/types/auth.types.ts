import { Request } from 'express';

export interface AuthenticatedUser {
  userId: string;
  email: string;
  name?: string;
  role: string;
  agencyId?: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  agencyId?: string;
  iat?: number;
  exp?: number;
}
