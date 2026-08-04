import type { Request, Response } from 'express';
import { ZodError } from 'zod';
import { registerSchema } from '../schemas/auth.schema.js';
import { registerUser } from '../services/auth.service.js';
import { AppError } from '../errors/app-error.js';

export async function register(req: Request, res: Response) {
  try {
    const data = registerSchema.parse(req.body);
    const user = await registerUser(data);
    return res.status(201).json(user);
  } catch (error) {
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
}