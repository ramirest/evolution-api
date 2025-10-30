import { Response, NextFunction } from 'express';
import { validate, ValidationError } from 'class-validator';
import { plainToClass } from 'class-transformer';
import { Logger } from '@config/logger.config';
import { BadRequestException } from '@exceptions';
import { AuthenticatedRequest } from '../types/auth.types';

const logger = new Logger('ValidationMiddleware');

type DtoClass = new (...args: any[]) => any;

/**
 * Middleware para validar request body usando class-validator
 * @param dtoClass - Classe DTO que será usada para validação
 */
export function validationMiddleware(dtoClass: DtoClass, source: 'body' | 'query' | 'params' = 'body') {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      // Transformar plain object para instância da classe DTO
      const dtoInstance = plainToClass(dtoClass, req[source], {
        enableImplicitConversion: true,
        excludeExtraneousValues: false,
      });

      // Validar a instância
      const errors: ValidationError[] = await validate(dtoInstance, {
        whitelist: true,
        forbidNonWhitelisted: true,
        validationError: { target: false },
      });

      if (errors.length > 0) {
        const formattedErrors = formatValidationErrors(errors);
        logger.warn(`Validation failed: ${JSON.stringify(formattedErrors)}`);
        throw new BadRequestException('Validation failed', formattedErrors);
      }

      // Substituir o source original pelo DTO validado
      req[source] = dtoInstance;
      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Formata erros de validação para resposta
 */
function formatValidationErrors(errors: ValidationError[]): any {
  return errors.reduce((acc, error) => {
    const property = error.property;
    const constraints = error.constraints || {};
    const messages = Object.values(constraints);

    acc[property] = messages.length > 0 ? messages : ['Invalid value'];

    // Se houver erros aninhados, processar recursivamente
    if (error.children && error.children.length > 0) {
      acc[property] = formatValidationErrors(error.children);
    }

    return acc;
  }, {} as Record<string, any>);
}

/**
 * Middleware para validar ObjectId do MongoDB
 */
export function validateObjectId(paramName: string = 'id') {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const id = req.params[paramName];
    
    if (!id) {
      throw new BadRequestException(`Missing parameter: ${paramName}`);
    }

    // Validar formato ObjectId (24 caracteres hexadecimais)
    const objectIdPattern = /^[0-9a-fA-F]{24}$/;
    if (!objectIdPattern.test(id)) {
      throw new BadRequestException(`Invalid ${paramName} format`);
    }

    next();
  };
}
