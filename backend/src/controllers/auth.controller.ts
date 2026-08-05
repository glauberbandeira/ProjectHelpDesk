import type { Request, Response } from 'express';
import { registerSchema, loginSchema } from '../schemas/auth.schema.js';
import { registerUser, loginUser } from '../services/auth.service.js';
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