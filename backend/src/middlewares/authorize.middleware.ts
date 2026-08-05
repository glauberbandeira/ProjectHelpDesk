// Tipos do Express, só para tipagem (não viram código em runtime).
import type { Request, Response, NextFunction } from 'express';

// Os papéis possíveis no sistema (iguais ao enum Role do schema).
type Role = 'CLIENTE' | 'ATENDENTE';

// "Fábrica de middleware": recebe os papéis permitidos e DEVOLVE um middleware.
// Ex.: authorize('ATENDENTE') cria um porteiro que só deixa atendente passar.
export function authorize(...allowedRoles: Role[]) {
  // Este é o middleware que roda na requisição.
  return (req: Request, res: Response, next: NextFunction) => {
    // 'authorize' SEMPRE roda depois de 'authenticate', então req.user já existe.
    // Se não existir, a ordem das rotas está errada — barra por segurança.
    if (!req.user) {
      return res.status(401).json({ message: 'Não autenticado' });
    }

    // O papel do usuário está na lista de permitidos?
    if (!allowedRoles.includes(req.user.role)) {
      // Logado, mas SEM permissão para esta área → 403 (proibido).
      return res.status(403).json({ message: 'Acesso negado' });
    }

    // Papel permitido → libera para o controller.
    return next();
  };
}