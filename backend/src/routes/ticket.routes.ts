// Router do Express para agrupar as rotas de chamados.
import { Router } from 'express';

// Porteiro: exige estar logado para abrir chamado.
import { authenticate } from '../middlewares/auth.middleware.js';

// Controller de criação.
import { create, list, getById  } from '../controllers/ticket.controller.js';

// Instancia o grupo de rotas.
export const ticketRoutes = Router();

// POST /tickets → precisa estar autenticado. Fila: authenticate → create.
ticketRoutes.post('/', authenticate, create);

// GET /tickets → autenticado. O serviço filtra pelo papel de quem pediu.
ticketRoutes.get('/', authenticate, list);

// GET /tickets/:id → autenticado. O serviço verifica permissão de acesso.
ticketRoutes.get('/:id', authenticate, getById);
