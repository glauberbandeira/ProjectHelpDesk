import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  CORS_ORIGIN: z.string().url().default('http://localhost:5173'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL é obrigatória'),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET deve ter ao menos 16 caracteres'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Configuração inválida. Confira seu arquivo .env:');
  for (const issue of parsed.error.issues) {
    console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
  }
  process.exit(1);
}

export const env = parsed.data;