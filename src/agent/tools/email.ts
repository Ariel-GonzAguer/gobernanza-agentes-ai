// ─── Tool: correo simulado ───

import { z } from 'zod';
import type { ToolDefinition, ToolResult } from '../types';

/** Esquema de argumentos de `email.send`. */
export const emailSendSchema = z.object({
  to: z.string().regex(/^[^@\s]+@[^@\s]+\.[^@\s]+$/, 'correo inválido'),
  subject: z.string().min(1),
  body: z.string().min(1),
});

/** Envía un correo en el mundo simulado (queda registrado, no sale a Internet). */
export const emailSendTool: ToolDefinition = {
  name: 'email.send',
  description: 'Envía un correo simulado y lo registra en el mundo.',
  schema: emailSendSchema,
  execute(args, world): ToolResult {
    const { to, subject, body } = emailSendSchema.parse(args);
    world.emails.push({ to, subject, body, sentAt: new Date().toISOString() });
    return { ok: true, output: { to, subject } };
  },
};
