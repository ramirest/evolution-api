import { Request, Response, NextFunction } from 'express';
import { Logger } from '@config/logger.config';

const logger = new Logger('ErrorHandler');

export interface HttpError extends Error {
  status?: number;
  statusCode?: number;
  error?: string;
  errors?: any;
}

/**
 * Middleware centralizado de tratamento de erros para Smart Broker
 * Deve ser registrado APÓS todas as rotas
 */
export function errorHandlerMiddleware(
  error: HttpError,
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Se a resposta já foi enviada, delegar para o error handler padrão
  if (res.headersSent) {
    return next(error);
  }

  const statusCode = error.status || error.statusCode || 500;
  const message = error.message || 'Internal Server Error';

  // Log do erro
  if (statusCode >= 500) {
    logger.error(`[${statusCode}] ${message} - ${error.stack || ''}`);
  } else {
    logger.warn(`[${statusCode}] ${message}`);
  }

  // Resposta padronizada
  res.status(statusCode).json({
    status: statusCode,
    error: error.error || getErrorName(statusCode),
    message,
    ...(error.errors && { errors: error.errors }),
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
  });
}

function getErrorName(statusCode: number): string {
  const errorNames: Record<number, string> = {
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    409: 'Conflict',
    422: 'Unprocessable Entity',
    429: 'Too Many Requests',
    500: 'Internal Server Error',
    502: 'Bad Gateway',
    503: 'Service Unavailable',
  };

  return errorNames[statusCode] || 'Error';
}
