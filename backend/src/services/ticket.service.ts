// Singleton do Prisma Client — nossa porta de acesso ao banco.
import { prisma } from '../lib/prisma.js';

// Tipo da entrada validada, para tipar o parâmetro 'data'.
import type { CreateTicketInput } from '../schemas/ticket.schema.js';

// Cria um chamado no banco. Recebe o id do autor SEPARADO do corpo,
// porque ele vem do token (quem está logado), não do que o cliente enviou.
export async function createTicket(authorId: string, data: CreateTicketInput) {
  // Insere o chamado. status (ABERTO) e priority (default) vêm do schema Prisma;
  // assigneeId nasce null — ninguém assumiu ainda.
  const ticket = await prisma.ticket.create({
    data: {
      title: data.title,
      description: data.description,
      priority: data.priority,
      authorId, // liga o chamado ao usuário logado (relação "TicketAuthor")
    },
  });

  // O ticket não tem dado sensível, então podemos devolvê-lo direto.
  return ticket;
}

// Lista chamados de acordo com QUEM está pedindo.
// Recebe o usuário logado (id + role) para decidir o que mostrar.
export async function listTickets(user: { id: string; role: 'CLIENTE' | 'ATENDENTE' }) {
  // Monta o filtro base: nunca mostrar chamados excluídos (soft-delete).
  // 'where' vai crescendo conforme a regra de negócio.
  const where: {
    deletedAt: null;
    authorId?: string;
  } = {
    deletedAt: null,
  };

  // A REGRA DE OURO: se for CLIENTE, restringe aos chamados de que ele é autor.
  // Se for ATENDENTE, não adiciona esse filtro → vê todos.
  if (user.role === 'CLIENTE') {
    where.authorId = user.id;
  }

  // Busca no banco com o filtro montado, do mais recente para o mais antigo.
  const tickets = await prisma.ticket.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    // 'select' devolve só os campos da listagem (não precisa da descrição inteira aqui).
    select: {
      id: true,
      title: true,
      status: true,
      priority: true,
      authorId: true,
      assigneeId: true,
      createdAt: true,
    },
  });

  return tickets;
}