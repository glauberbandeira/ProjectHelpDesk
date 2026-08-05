import { Router } from 'express';
import { login, register, me, staffArea, logout } from '../controllers/auth.controller.js';
// Importa os dois porteiros: autenticação (quem é você) e autorização (o que pode).
import { authenticate } from '../middlewares/auth.middleware.js';
// ⬇️ ADICIONE este import novo:
import { authorize } from '../middlewares/authorize.middleware.js';

export const authRoutes = Router();

authRoutes.post('/register', register);
authRoutes.post('/login', login);
authRoutes.get('/me', authenticate, me);
// ⬇️ ADICIONE esta rota. 'authenticate' garante que só quem está logado desloga.
authRoutes.post('/logout', authenticate, logout);

// ⬇️ ADICIONE esta rota nova. São 2 porteiros em fila:
//    1º authenticate (tem token?) → 2º authorize (é atendente?) → controller.
authRoutes.get('/staff', authenticate, authorize('ATENDENTE'), staffArea);