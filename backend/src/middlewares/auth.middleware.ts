import type { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../lib/jwt.js';

// O tipo dos papéis válidos. Reaproveita os valores do enum do Prisma.
type Role = 'CLIENTE' | 'ATENDENTE';

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.token;

  if (!token) {
    return res.status(401).json({ message: 'Não autenticado' });
  }

  try {
    const payload = verifyToken(token);
    req.user = { id: payload.sub, role: payload.role };
    return next();
  } catch {
    return res.status(401).json({ message: 'Sessão inválida ou expirada' });
  }
}

// FÁBRICA de middleware: recebe os papéis permitidos (ex: 'ATENDENTE')
// e DEVOLVE um middleware já configurado com essa lista.
// O '...allowedRoles' junta todos os argumentos num array (rest parameters).
export function authorize(...allowedRoles: Role[]) {
  // Este é o middleware de fato, que o Express vai executar na requisição.
  return (req: Request, res: Response, next: NextFunction) => {
    // Rede de segurança: se não houver usuário na req, é porque o 'authenticate'
    // não rodou antes. Barra com 401 (não autenticado).
    if (!req.user) {
      return res.status(401).json({ message: 'Não autenticado' });
    }

    // O CORAÇÃO da autorização: o papel do usuário está na lista de permitidos?
    // .includes() devolve true/false. Se NÃO estiver, barra com 403 (proibido).
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Acesso negado' });
    }

    // Papel autorizado: libera a requisição para o controller.
    return next();
  };
}