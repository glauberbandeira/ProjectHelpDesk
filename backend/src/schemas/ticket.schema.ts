// Zod: biblioteca de validação que também gera o tipo TypeScript.
import { z } from 'zod';

// Formato esperado no corpo (body) ao criar um chamado.
export const createTicketSchema = z.object({
  // Título obrigatório, entre 3 e 120 caracteres.
  title: z.string().min(3, 'Título muito curto').max(120, 'Título muito longo'),

  // Descrição obrigatória, com no mínimo 5 caracteres.
  description: z.string().min(5, 'Descrição muito curta'),

  // Prioridade só pode ser um destes 3 valores; se vier vazia, assume MEDIA.
  priority: z.enum(['BAIXA', 'MEDIA', 'ALTA']).default('MEDIA'),
});

// Tipo TypeScript derivado do schema — uma fonte de verdade só.
export type CreateTicketInput = z.infer<typeof createTicketSchema>;

// Formato do corpo ao atualizar o status: só aceita um destes 4 valores.
export const updateStatusSchema = z.object({
  status: z.enum(['ABERTO', 'EM_ANDAMENTO', 'RESOLVIDO', 'FECHADO']),
});

// Tipo derivado do schema.
export type UpdateStatusInput = z.infer<typeof updateStatusSchema>;