// Router do Express para agrupar as rotas de chamados.
import { Router } from 'express';

// Porteiro: exige estar logado para abrir chamado.
import { authenticate } from '../middlewares/auth.middleware.js';

// Controller de criação.
import { create, list, getById, updateStatus  } from '../controllers/ticket.controller.js';

// Porteiro: exige estar logado para abrir chamado.
import { authorize } from '../middlewares/authorize.middleware.js';

// Instancia o grupo de rotas.
export const ticketRoutes = Router();

// POST /tickets → precisa estar autenticado. Fila: authenticate → create.
ticketRoutes.post('/', authenticate, create);

// GET /tickets → autenticado. O serviço filtra pelo papel de quem pediu.
ticketRoutes.get('/', authenticate, list);

// GET /tickets/:id → autenticado. O serviço verifica permissão de acesso.
ticketRoutes.get('/:id', authenticate, getById);

// PATCH /tickets/:id/status → 3 porteiros em fila:
// autenticado → é ATENDENTE → controller. Cliente não muda status.
ticketRoutes.patch('/:id/status', authenticate, authorize('ATENDENTE'), updateStatus);