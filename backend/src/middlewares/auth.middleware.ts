import type { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../lib/jwt.js';

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.token;

  if (!token) {
    return res.status(401).json({ message: 'Não autenticado' });
  }

  try {
    const payload = verifyToken(token);
    req.user = { id: payload.sub, role: payload.role };
    return next();
  } catch {
    return res.status(401).json({ message: 'Sessão inválida ou expirada' });
  }
}