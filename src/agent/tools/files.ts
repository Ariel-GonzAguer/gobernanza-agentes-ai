// ─── Tools: archivos simulados ───

import { z } from 'zod';
import type { ToolDefinition, ToolResult } from '../types';

/** Esquema de argumentos de `files.read`. */
export const filesReadSchema = z.object({
  path: z.string().min(1),
});

/** Esquema de argumentos de `files.write`. */
export const filesWriteSchema = z.object({
  path: z.string().min(1),
  content: z.string(),
});

/** Lee un archivo del mundo simulado. */
export const filesReadTool: ToolDefinition = {
  name: 'files.read',
  description: 'Lee un archivo del mundo simulado.',
  schema: filesReadSchema,
  execute(args, world): ToolResult {
    const { path } = filesReadSchema.parse(args);
    const content = world.files.get(path);

    if (content === undefined) {
      return { ok: false, error: `El archivo "${path}" no existe.` };
    }

    return { ok: true, output: { path, content } };
  },
};

/** Escribe un archivo en el mundo simulado. */
export const filesWriteTool: ToolDefinition = {
  name: 'files.write',
  description: 'Escribe un archivo en el mundo simulado.',
  schema: filesWriteSchema,
  execute(args, world): ToolResult {
    const { path, content } = filesWriteSchema.parse(args);
    world.files.set(path, content);
    return { ok: true, output: { path, bytes: content.length } };
  },
};
