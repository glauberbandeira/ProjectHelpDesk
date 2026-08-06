// Singleton do Prisma Client — nossa porta de acesso ao banco.
import { prisma } from '../lib/prisma.js';

// Tipo da entrada validada, para tipar o parâmetro 'data'.
import type { CreateTicketInput } from '../schemas/ticket.schema.js';

// Importa nosso erro de aplicação (carrega a mensagem + o status HTTP).
import { AppError } from '../errors/app-error.js';

// Importa o tipo Status gerado pelo Prisma (os valores do enum do banco).
// ⬇️ ADICIONE este import no TOPO do arquivo, junto dos outros:
import type { Status } from '../generated/prisma/client.js';

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

// Busca um chamado por id e SÓ devolve se o usuário tiver permissão de vê-lo.
export async function getTicketById(
  ticketId: string,
  user: { id: string; role: 'CLIENTE' | 'ATENDENTE' },
) {
  // Procura o chamado que não esteja excluído, já trazendo os comentários juntos.
  const ticket = await prisma.ticket.findFirst({
    where: { id: ticketId, deletedAt: null },
    include: {
      // Traz os comentários do chamado (relação Ticket 1-N Comment),
      // os não-excluídos, do mais antigo para o mais novo (ordem de conversa).
      comments: {
        where: { deletedAt: null },
        orderBy: { createdAt: 'asc' },
        // De cada comentário, mostra o autor (só nome e papel — sem dado sensível).
        include: {
          author: { select: { id: true, name: true, role: true } },
        },
      },
    },
  });

  // Não achou (ou está excluído) → 404.
  if (!ticket) {
    throw new AppError('Chamado não encontrado', 404);
  }

  // A VERIFICAÇÃO DE ACESSO: é atendente OU é o dono do chamado?
  const isAtendente = user.role === 'ATENDENTE';
  const isDono = ticket.authorId === user.id;

  // Se não é nenhum dos dois, nega o acesso com 403 (proibido).
  if (!isAtendente && !isDono) {
    throw new AppError('Acesso negado', 403);
  }

  // Passou na verificação → devolve o chamado completo (com comentários).
  return ticket;
}

// O MAPA DA MÁQUINA DE ESTADOS: para cada status, quais são os próximos permitidos.
// Ex.: de ABERTO só dá para ir a EM_ANDAMENTO. FECHADO é final (lista vazia).
const TRANSICOES_VALIDAS: Record<Status, Status[]> = {
  ABERTO: ['EM_ANDAMENTO'],
  EM_ANDAMENTO: ['RESOLVIDO', 'FECHADO'],
  RESOLVIDO: ['FECHADO', 'EM_ANDAMENTO'], // permite reabrir
  FECHADO: [],                            // estado final: não sai dele
};

// Atualiza o status de um chamado, validando se a transição é permitida.
export async function updateTicketStatus(ticketId: string, novoStatus: Status) {
  // Busca o chamado (não-excluído) para saber o status atual.
  const ticket = await prisma.ticket.findFirst({
    where: { id: ticketId, deletedAt: null },
  });

  // Não achou → 404.
  if (!ticket) {
    throw new AppError('Chamado não encontrado', 404);
  }

  // Se o novo status é igual ao atual, não há o que mudar → 400.
  if (ticket.status === novoStatus) {
    throw new AppError('O chamado já está neste status', 400);
  }

  // Consulta o mapa: a transição do status atual para o novo é válida?
  const permitidos = TRANSICOES_VALIDAS[ticket.status];
  if (!permitidos.includes(novoStatus)) {
    // Transição impossível (ex.: ABERTO → FECHADO) → 400 com mensagem clara.
    throw new AppError(
      `Transição inválida: de ${ticket.status} para ${novoStatus}`,
      400,
    );
  }

  // Transição válida → grava o novo status. O updatedAt se atualiza sozinho.
  const atualizado = await prisma.ticket.update({
    where: { id: ticketId },
    data: { status: novoStatus },
  });

  return atualizado;
}