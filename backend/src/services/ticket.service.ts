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