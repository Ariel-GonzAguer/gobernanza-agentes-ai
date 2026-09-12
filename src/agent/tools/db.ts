// ─── Tools: base de datos simulada ───

import { z } from 'zod';
import type { ToolDefinition, ToolResult } from '../types';

/** Esquema de argumentos de `db.query` y `db.drop`. */
export const dbTableSchema = z.object({
  table: z.string().min(1),
});

/** Consulta las filas de la tabla simulada. */
export const dbQueryTool: ToolDefinition<z.infer<typeof dbTableSchema>> = {
  name: 'db.query',
  description: 'Consulta las filas de la tabla simulada.',
  schema: dbTableSchema,
  execute({ table }, world): ToolResult {

    if (table !== world.db.table) {
      return { ok: false, error: `La tabla "${table}" no existe.` };
    }

    return { ok: true, output: { table, rows: world.db.rows } };
  },
};

/** Vacía la tabla simulada. Acción destructiva a propósito, para las demos de gobernanza. */
export const dbDropTool: ToolDefinition<z.infer<typeof dbTableSchema>> = {
  name: 'db.drop',
  description: 'Vacía la tabla simulada (acción destructiva).',
  schema: dbTableSchema,
  execute({ table }, world): ToolResult {

    if (table !== world.db.table) {
      return { ok: false, error: `La tabla "${table}" no existe.` };
    }

    const droppedRows = world.db.rows.length;
    world.db.rows.length = 0;
    return { ok: true, output: { table, droppedRows } };
  },
};
