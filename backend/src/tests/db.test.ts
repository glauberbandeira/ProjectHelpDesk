import { describe, it, expect, afterAll } from 'vitest';
import { prisma } from '../lib/prisma.js';

describe('Conexão com o banco', () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('deve conectar e executar uma query simples', async () => {
    const result = await prisma.$queryRaw<{ ok: number }[]>`SELECT 1 as ok`;
    expect(result[0]?.ok).toBe(1);
  });

  it('deve conseguir acessar a tabela users', async () => {
    const count = await prisma.user.count();
    expect(typeof count).toBe('number');
    expect(count).toBeGreaterThanOrEqual(0);
  });
});