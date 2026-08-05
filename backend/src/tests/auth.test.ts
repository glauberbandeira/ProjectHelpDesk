// Ferramentas do Vitest: describe/it agrupam e definem os testes;
// expect faz as asserções; beforeEach/afterAll rodam antes/depois.
import { describe, it, expect, beforeEach, afterAll } from 'vitest';

// Supertest dispara requisições HTTP contra o app, sem precisar subir servidor.
import request from 'supertest';

// Monta o app (sem listen) — o padrão app factory pagando de novo.
import { createApp } from '../app.js';

// Client do banco, usado só para limpar os usuários de teste.
import { prisma } from '../lib/prisma.js';

// Monta o app uma única vez para todos os testes deste arquivo.
const app = createApp();

// Dados de um usuário de teste. O domínio '@authtest.local' existe só nos testes,
// para conseguirmos apagar SÓ os usuários de teste (isolamento dos seus dados reais).
const testUser = {
  name: 'Usuario Teste',
  email: 'maria@authtest.local',
  password: 'senha12345',
  acceptedPolicy: true,
};

// Apaga (hard-delete) os usuários de teste do banco.
async function limparUsuariosDeTeste() {
  await prisma.user.deleteMany({
    where: { email: { endsWith: '@authtest.local' } },
  });
}

// Antes de CADA teste: começa com o banco limpo (isolamento).
beforeEach(async () => {
  await limparUsuariosDeTeste();
});

// Ao fim de TODO o arquivo: limpa de novo e fecha a conexão (evita o Vitest travar).
afterAll(async () => {
  await limparUsuariosDeTeste();
  await prisma.$disconnect();
});

describe('POST /auth/register', () => {
  it('cadastra um novo usuário e não retorna o passwordHash', async () => {
    // Envia o cadastro para a API.
    const res = await request(app).post('/auth/register').send(testUser);

    // Deve responder 201 (criado)...
    expect(res.status).toBe(201);
    expect(res.body.email).toBe(testUser.email);
    expect(res.body.role).toBe('CLIENTE');
    // ...mas NUNCA expor o hash da senha.
    expect(res.body.passwordHash).toBeUndefined();
  });

  it('recusa e-mail duplicado com 409', async () => {
    // Cadastra uma vez...
    await request(app).post('/auth/register').send(testUser);
    // ...e tenta de novo com o mesmo e-mail.
    const res = await request(app).post('/auth/register').send(testUser);

    // Deve barrar com 409 (conflito de unicidade).
    expect(res.status).toBe(409);
  });

  it('recusa dados inválidos com 400 (senha curta e sem consentimento)', async () => {
    // Envia senha curta e sem aceitar a política de privacidade.
    const res = await request(app)
      .post('/auth/register')
      .send({ ...testUser, password: '123', acceptedPolicy: false });

    // Deve barrar com 400 (falha na validação do Zod).
    expect(res.status).toBe(400);
  });
});

describe('POST /auth/login', () => {
  // Antes de cada teste de login, garante que o usuário existe no banco.
  beforeEach(async () => {
    await request(app).post('/auth/register').send(testUser);
  });

  it('faz login com senha correta e devolve 200 + cookie httpOnly', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: testUser.email, password: testUser.password });

    // Deve responder 200...
    expect(res.status).toBe(200);
    // ...e mandar o cookie 'token' com a flag HttpOnly.
    const cookies = res.headers['set-cookie'];
    expect(cookies?.[0]).toContain('token=');
    expect(cookies?.[0]).toContain('HttpOnly');
  });

  it('recusa senha errada com 401', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: testUser.email, password: 'senhaErrada' });

    // Mesma resposta genérica que protege contra enumeração de usuários.
    expect(res.status).toBe(401);
  });
});

describe('GET /auth/me (rota protegida)', () => {
  it('barra o acesso sem token com 401', async () => {
    // Sem login → sem cookie → deve barrar.
    const res = await request(app).get('/auth/me');
    expect(res.status).toBe(401);
  });

  it('devolve o perfil quando autenticado', async () => {
    // O 'agent' guarda os cookies entre requisições, igual a um navegador.
    const agent = request.agent(app);

    // Cadastra e loga (o agent guarda o cookie do login automaticamente).
    await agent.post('/auth/register').send(testUser);
    await agent.post('/auth/login').send({
      email: testUser.email,
      password: testUser.password,
    });

    // Acessa a rota protegida reutilizando o cookie guardado pelo agent.
    const res = await agent.get('/auth/me');

    // Deve responder 200 com o perfil (e sem passwordHash).
    expect(res.status).toBe(200);
    expect(res.body.email).toBe(testUser.email);
    expect(res.body.passwordHash).toBeUndefined();
  });
});

describe('GET /auth/staff (autorização por papel)', () => {
  it('barra um CLIENTE com 403', async () => {
    const agent = request.agent(app);

    // Cadastra (nasce CLIENTE) e loga.
    await agent.post('/auth/register').send(testUser);
    await agent.post('/auth/login').send({
      email: testUser.email,
      password: testUser.password,
    });

    // Cliente tentando a área de atendente → deve dar 403 (proibido).
    const res = await agent.get('/auth/staff');
    expect(res.status).toBe(403);
  });
});