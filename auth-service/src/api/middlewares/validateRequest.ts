import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { isValidPhone, isValidCode, normalizePhone } from '../../utils/validators';
import { ValidationError } from '../../utils/errors';

/**
 * Zod validation schemas
 */

// Telefon raqam validator
const phoneSchema = z.string().refine((phone) => isValidPhone(normalizePhone(phone)), {
  message: 'Invalid phone number format. Expected: +998XXXXXXXXX',
});

// Kod validator
const codeSchema = z.string().refine(isValidCode, {
  message: 'Invalid code format. Expected: 4 digits',
});

// Verify code request schema
export const verifyCodeSchema = z.object({
  phone: phoneSchema,
  code: codeSchema,
});

/**
 * Validation middleware factory
 */
export const validateRequest = (schema: z.ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = await schema.parseAsync(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const messages = error.errors.map((err) => `${err.path.join('.')}: ${err.message}`);
        next(new ValidationError(messages.join(', ')));
      } else {
        next(error);
      }
    }
  };
};
