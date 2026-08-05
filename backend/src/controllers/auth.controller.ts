import type { Request, Response } from 'express';
import { registerSchema, loginSchema } from '../schemas/auth.schema.js';
import { registerUser, loginUser, getUserById } from '../services/auth.service.js';
import { signToken, ONE_DAY_IN_SECONDS } from '../lib/jwt.js';
import { handleError } from '../errors/handle-error.js';
import { env } from '../config/env.js';

export async function register(req: Request, res: Response) {
  try {
    const data = registerSchema.parse(req.body);
    const user = await registerUser(data);
    return res.status(201).json(user);
  } catch (error) {
    return handleError(error, res);
  }
}

export async function login(req: Request, res: Response) {
  try {
    const data = loginSchema.parse(req.body);
    const user = await loginUser(data);

    const token = signToken({ sub: user.id, role: user.role });

    res.cookie('token', token, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: ONE_DAY_IN_SECONDS * 1000,
    });

    return res.status(200).json(user);
  } catch (error) {
    return handleError(error, res);
  }
}

// Rota protegida: devolve o perfil completo do usuário logado.
export async function me(req: Request, res: Response) {
  try {
    // req.user! existe porque o middleware 'authenticate' rodou antes.
    // O '!' diz ao TS: "confie, aqui não é undefined".
    const user = await getUserById(req.user!.id);

    // Responde 200 com o perfil limpo.
    return res.status(200).json(user);
  } catch (error) {
    // Reaproveita nosso tratador central de erros (404, 500, etc.).
    return handleError(error, res);
  }
}

// Controller de demonstração de área restrita a atendentes.
export async function staffArea(req: Request, res: Response) {
  // Se a execução chegou aqui, os middlewares já garantiram que é ATENDENTE.
  return res.status(200).json({ message: 'Bem-vindo à área de atendentes' });
}

// Rota protegida: encerra a sessão limpando o cookie do token.
export async function logout(_req: Request, res: Response) {
  // Apaga o cookie 'token'. As opções devem BATER com as do login,
  // senão o navegador não reconhece qual cookie limpar.
  res.clearCookie('token', {
    httpOnly: true,                              // igual ao login
    secure: env.NODE_ENV === 'production',       // igual ao login
    sameSite: 'lax',                             // igual ao login
  });

  // Confirma o logout.
  return res.status(200).json({ message: 'Logout realizado' });
}