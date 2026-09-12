// ─── Registro de tools ───

import { z } from 'zod';
import type { PreparedToolCall, SimulatedWorld, ToolCall, ToolDefinition, ToolResult } from '../types';
import { dbDropTool, dbQueryTool } from './db';
import { emailSendTool } from './email';
import { filesReadTool, filesWriteTool } from './files';
import { searchWebTool } from './search';

/** Tools disponibles para el agente de práctica. */
export const TOOLS: ToolDefinition[] = [
  searchWebTool,
  filesReadTool,
  filesWriteTool,
  emailSendTool,
  dbQueryTool,
  dbDropTool,
];

/** Resultado de resolver y validar una tool call. */
export type ToolPreparationResult =
  | { ok: true; prepared: PreparedToolCall }
  | { ok: false; result: ToolResult };

/**
 * Formatea un error de Zod en un mensaje legible.
 * @param error - Error de validación de Zod.
 * @returns Mensaje con cada problema separado por " | ".
 */
function formatZodError(error: z.ZodError): string {
  return error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join(' | ');
}

/**
 * Resuelve una tool y normaliza sus argumentos antes de autorizarla o ejecutarla.
 *
 * La call preparada es la única representación que debe recibir una política.
 * Así se evita autorizar campos que el esquema descartará o valores que todavía
 * no han sido transformados.
 *
 * @param call - Tool call propuesta por el modelo.
 * @returns Una call canónica ejecutable o un error controlado.
 * @example
 * const prepared = prepareToolCall({
 *   id: 'call-1',
 *   name: 'files.read',
 *   args: { path: 'notas.md', campoIgnorado: true },
 * });
 * // prepared.prepared.call.args → { path: 'notas.md' }
 */
export function prepareToolCall(call: ToolCall): ToolPreparationResult {
  const tool = TOOLS.find((candidate) => candidate.name === call.name);

  if (tool === undefined) {
    return { ok: false, result: { ok: false, error: `Tool desconocida: "${call.name}".` } };
  }

  const parsed = tool.schema.safeParse(call.args);

  if (!parsed.success) {
    return {
      ok: false,
      result: { ok: false, error: `Argumentos inválidos: ${formatZodError(parsed.error)}` },
    };
  }

  const canonicalCall: ToolCall = { ...call, args: parsed.data };

  return {
    ok: true,
    prepared: {
      call: canonicalCall,
      async execute(world): Promise<ToolResult> {
        try {
          return await tool.execute(parsed.data, world);
        } catch (error: unknown) {
          return { ok: false, error: error instanceof Error ? error.message : String(error) };
        }
      },
    },
  };
}

/**
 * Ejecuta una tool por nombre contra el mundo simulado.
 *
 * Nunca lanza: los errores de validación o ejecución se devuelven como `ok: false`.
 *
 * @param name - Nombre de la tool a ejecutar.
 * @param args - Argumentos sin validar; el registro los normaliza con el esquema Zod.
 * @param world - Mundo simulado sobre el que opera la tool.
 * @returns Resultado de la tool, exitoso o con error controlado.
 * @example
 * const result = await runTool('db.query', { table: 'usuarios' }, world);
 * // result.ok → true
 */
export async function runTool(name: string, args: unknown, world: SimulatedWorld): Promise<ToolResult> {
  const preparation = prepareToolCall({
    id: 'direct-tool-call',
    name,
    args: typeof args === 'object' && args !== null && !Array.isArray(args) ? { ...args } : {},
  });

  if (!preparation.ok) {
    return preparation.result;
  }

  return preparation.prepared.execute(world);
}
