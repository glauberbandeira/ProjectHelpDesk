import bcrypt from 'bcrypt';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../errors/app-error.js';
import type { RegisterInput } from '../schemas/auth.schema.js';
import type { LoginInput } from '../schemas/auth.schema.js';

const CURRENT_POLICY_VERSION = '1.0';
const SALT_ROUNDS = 10;

export async function registerUser(data: RegisterInput) {
  const existing = await prisma.user.findUnique({
    where: { email: data.email },
  });

  if (existing) {
    throw new AppError('E-mail já cadastrado', 409);
  }

  const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      passwordHash,
      consentAt: new Date(),
      policyVersion: CURRENT_POLICY_VERSION,
    },
  });

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
  };
}

export async function loginUser(data: LoginInput) {
  const user = await prisma.user.findUnique({
    where: { email: data.email },
  });

  const invalidCredentials = new AppError('Credenciais inválidas', 401);

  if (!user || user.deletedAt) {
    throw invalidCredentials;
  }

  const passwordMatches = await bcrypt.compare(data.password, user.passwordHash);
  if (!passwordMatches) {
    throw invalidCredentials;
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };
}