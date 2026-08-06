// Tipos do Express só para tipagem da requisição e resposta.
import type { Request, Response } from 'express';

// Schema de validação do corpo.
import { createTicketSchema, updateStatusSchema  } from '../schemas/ticket.schema.js';

// Regra de negócio de criação.
import { createTicket, listTickets, getTicketById, updateTicketStatus } from '../services/ticket.service.js';

// Tratador central de erros (Zod → 400, AppError → status, resto → 500).
import { handleError } from '../errors/handle-error.js';

// Controller da rota POST /tickets.
export async function create(req: Request, res: Response) {
  try {
    // Valida o corpo; se inválido, lança ZodError (vira 400).
    const data = createTicketSchema.parse(req.body);

    // Cria o chamado usando o id do usuário logado (do token), não do body.
    // O '!' garante ao TS que req.user existe (o middleware authenticate rodou antes).
    const ticket = await createTicket(req.user!.id, data);

    // 201 = recurso criado com sucesso.
    return res.status(201).json(ticket);
  } catch (error) {
    return handleError(error, res);
  }
}

// Controller da rota GET /tickets → lista os chamados que o usuário pode ver.
export async function list(req: Request, res: Response) {
  try {
    // Passa o usuário logado (do token) para o serviço decidir o que devolver.
    const tickets = await listTickets(req.user!);

    // 200 com a lista (pode vir vazia — isso é válido).
    return res.status(200).json(tickets);
  } catch (error) {
    return handleError(error, res);
  }
}

// Controller da rota GET /tickets/:id → detalhe de um chamado.
export async function getById(req: Request, res: Response) {
  try {
    // Extrai o id da URL. Com noUncheckedIndexedAccess, o TS o vê como
    // possivelmente undefined — por isso validamos antes de usar.
    const { id } = req.params;

    // Se por algum motivo não veio um id em texto, barra com 400.
    // (typeof !== 'string' cobre tanto undefined quanto casos inesperados.)
    if (typeof id !== 'string') {
      return res.status(400).json({ message: 'ID inválido' });
    }

    // Agora o TS sabe que 'id' é string — passa sem erro.
    const ticket = await getTicketById(id, req.user!);

    // 200 com o chamado + seus comentários.
    return res.status(200).json(ticket);
  } catch (error) {
    // Se não achou → 404; se não pode ver → 403; ambos tratados aqui.
    return handleError(error, res);
  }
}

// Controller da rota PATCH /tickets/:id/status → muda o status (só atendente).
export async function updateStatus(req: Request, res: Response) {
  try {
    // Extrai e valida o id da URL (mesma guarda do passo 4.3).
    const { id } = req.params;
    if (typeof id !== 'string') {
      return res.status(400).json({ message: 'ID inválido' });
    }

    // Valida o corpo: precisa vir um 'status' válido.
    const { status } = updateStatusSchema.parse(req.body);

    // Chama o serviço, que valida a transição na máquina de estados.
    const ticket = await updateTicketStatus(id, status);

    // 200 com o chamado já atualizado.
    return res.status(200).json(ticket);
  } catch (error) {
    return handleError(error, res);
  }
}