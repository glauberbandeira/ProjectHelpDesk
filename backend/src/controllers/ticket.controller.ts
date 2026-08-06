// Tipos do Express só para tipagem da requisição e resposta.
import type { Request, Response } from 'express';

// Schema de validação do corpo.
import { createTicketSchema } from '../schemas/ticket.schema.js';

// Regra de negócio de criação.
import { createTicket } from '../services/ticket.service.js';

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