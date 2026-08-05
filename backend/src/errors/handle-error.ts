import type { Response } from 'express';
import { ZodError } from 'zod';
import { AppError } from './app-error.js';

export function handleError(error: unknown, res: Response) {
  if (error instanceof ZodError) {
    return res.status(400).json({
      message: 'Dados inválidos',
      issues: error.issues.map((i) => ({
        field: i.path.join('.'),
        message: i.message,
      })),
    });
  }
  if (error instanceof AppError) {
    return res.status(error.statusCode).json({ message: error.message });
  }
  console.error(error);
  return res.status(500).json({ message: 'Erro interno' });
}