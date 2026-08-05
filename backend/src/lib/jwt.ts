import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export const ONE_DAY_IN_SECONDS = 60 * 60 * 24;

export interface TokenPayload {
  sub: string;                       // id do usuário
  role: 'CLIENTE' | 'ATENDENTE';
}

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: ONE_DAY_IN_SECONDS });
}

export function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, env.JWT_SECRET) as TokenPayload;
}