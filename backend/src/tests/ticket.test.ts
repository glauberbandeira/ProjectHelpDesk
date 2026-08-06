// Ferramentas do Vitest.
import { describe, it, expect, beforeEach, afterAll } from 'vitest';

// Supertest para disparar requisições contra o app.
import request from 'supertest';

// App montado sem listen (app factory).
import { createApp } from '../app.js';

// Client do banco, para limpar os dados de teste.
import { prisma } from '../lib/prisma.js';

// Monta o app uma vez para todos os testes.
const app = createApp();

// Sufixo de e-mail exclusivo destes testes, para apagar só o que é de teste.
const DOM = '@tickettest.local';

// Helper: cadastra um usuário, faz login e devolve um agent já autenticado.
// O agent guarda os cookies entre chamadas, como um navegador.
async function criarUsuario(email: string) {
  const agent = request.agent(app);
  const dados = {
    name: 'Teste',
    email,
    password: 'senha12345',
    acceptedPolicy: true,
  };
  await agent.post('/auth/register').send(dados);            // cria (nasce CLIENTE)
  await agent.post('/auth/login').send({ email, password: 'senha12345' }); // loga
  return agent;
}

// Promove um usuário a ATENDENTE direto no banco (simula um admin fazendo isso).
async function promoverParaAtendente(email: string) {
  await prisma.user.update({
    where: { email },
    data: { role: 'ATENDENTE' },
  });
}

// Limpa comentários, tickets e usuários de teste. Ordem importa: primeiro os
// "filhos" (comments, tickets) e depois os "pais" (users), por causa das relações.
async function limpar() {
  await prisma.comment.deleteMany({
    where: { author: { email: { endsWith: DOM } } },
  });
  await prisma.ticket.deleteMany({
    where: { author: { email: { endsWith: DOM } } },
  });
  await prisma.user.deleteMany({
    where: { email: { endsWith: DOM } },
  });
}

// Cada teste começa com o banco limpo (isolamento).
beforeEach(async () => {
  await limpar();
});

// Ao fim de tudo: limpa e fecha a conexão.
afterAll(async () => {
  await limpar();
  await prisma.$disconnect();
});

describe('POST /tickets', () => {
  it('cria um chamado com status ABERTO e autoria do usuário logado', async () => {
    // Cria um cliente autenticado.
    const cliente = await criarUsuario(`c1${DOM}`);

    // Abre um chamado.
    const res = await cliente.post('/tickets').send({
      title: 'Meu PC não liga',
      description: 'Tela preta ao ligar',
      priority: 'ALTA',
    });

    // Deve criar (201) com status inicial ABERTO e prioridade ALTA.
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('ABERTO');
    expect(res.body.priority).toBe('ALTA');
    // assigneeId nasce nulo — ninguém assumiu ainda.
    expect(res.body.assigneeId).toBeNull();
  });

  it('barra a criação sem autenticação com 401', async () => {
    // request(app) puro = sem cookie.
    const res = await request(app).post('/tickets').send({
      title: 'Sem login',
      description: 'Não deveria criar',
    });
    expect(res.status).toBe(401);
  });
});

describe('GET /tickets (filtro por papel)', () => {
  it('cliente vê só os seus; atendente vê todos', async () => {
    // Dois clientes, cada um abre um chamado.
    const ana = await criarUsuario(`ana${DOM}`);
    const bruno = await criarUsuario(`bruno${DOM}`);
    await ana.post('/tickets').send({ title: 'Chamado Ana', description: 'desc ana' });
    await bruno.post('/tickets').send({ title: 'Chamado Bruno', description: 'desc bruno' });

    // Ana lista → deve ver exatamente 1 (o dela).
    const listaAna = await ana.get('/tickets');
    expect(listaAna.body).toHaveLength(1);
    expect(listaAna.body[0].title).toBe('Chamado Ana');

    // Promove a Ana a atendente e faz login de novo (token novo com o papel novo).
    await promoverParaAtendente(`ana${DOM}`);
    const anaAtendente = await criarLoginExistente(`ana${DOM}`);

    // Agora Ana (atendente) vê os 2 chamados.
    const listaTodos = await anaAtendente.get('/tickets');
    expect(listaTodos.body.length).toBeGreaterThanOrEqual(2);
  });
});

describe('GET /tickets/:id (IDOR)', () => {
  it('barra um cliente que tenta ver o chamado de outro com 403', async () => {
    const ana = await criarUsuario(`ana${DOM}`);
    const bruno = await criarUsuario(`bruno${DOM}`);

    // Ana abre um chamado e pegamos o id.
    const criado = await ana.post('/tickets').send({ title: 'Da Ana', description: 'privado' });
    const idAna = criado.body.id;

    // Bruno tenta acessar o chamado da Ana pelo id → deve dar 403.
    const res = await bruno.get(`/tickets/${idAna}`);
    expect(res.status).toBe(403);
  });
});

describe('PATCH /tickets/:id/status (máquina de estados)', () => {
  it('permite ABERTO → EM_ANDAMENTO e barra ABERTO → RESOLVIDO', async () => {
    // Cliente abre o chamado.
    const cliente = await criarUsuario(`cli${DOM}`);
    const criado = await cliente.post('/tickets').send({ title: 'Fluxo', description: 'testar status' });
    const id = criado.body.id;

    // Atendente para operar o status.
    const atendente = await criarUsuario(`at${DOM}`);
    await promoverParaAtendente(`at${DOM}`);
    const at = await criarLoginExistente(`at${DOM}`);

    // Transição válida → 200.
    const ok = await at.patch(`/tickets/${id}/status`).send({ status: 'EM_ANDAMENTO' });
    expect(ok.status).toBe(200);
    expect(ok.body.status).toBe('EM_ANDAMENTO');

    // Cria outro chamado ABERTO e tenta pulo proibido → 400.
    const outro = await cliente.post('/tickets').send({ title: 'Outro', description: 'pulo proibido' });
    const proibido = await at.patch(`/tickets/${outro.body.id}/status`).send({ status: 'RESOLVIDO' });
    expect(proibido.status).toBe(400);
  });

  it('barra um cliente tentando mudar status com 403', async () => {
    const cliente = await criarUsuario(`cli2${DOM}`);
    const criado = await cliente.post('/tickets').send({ title: 'Meu', description: 'nao mexo no status' });

    // O próprio cliente tenta mudar o status → 403 (só atendente pode).
    const res = await cliente.patch(`/tickets/${criado.body.id}/status`).send({ status: 'EM_ANDAMENTO' });
    expect(res.status).toBe(403);
  });
});

// Helper extra: faz login de um usuário que JÁ existe e devolve o agent.
// Usado após promover alguém a atendente (precisa de token novo com o papel novo).
async function criarLoginExistente(email: string) {
  const agent = request.agent(app);
  await agent.post('/auth/login').send({ email, password: 'senha12345' });
  return agent;
}