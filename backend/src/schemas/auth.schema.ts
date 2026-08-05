import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().min(2, 'Nome muito curto'),
  email: z.string().email('E-mail inválido'),
  password: z.string().min(8, 'A senha deve ter ao menos 8 caracteres'),
  acceptedPolicy: z.boolean().refine((v) => v === true, {
    message: 'É necessário aceitar a política de privacidade',
  }),
});

export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(1, 'Senha obrigatória'),
});

export type LoginInput = z.infer<typeof loginSchema>;