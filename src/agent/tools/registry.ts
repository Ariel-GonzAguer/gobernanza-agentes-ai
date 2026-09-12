// ─── Registro de tools ───

import { z } from 'zod';
import type { SimulatedWorld, ToolDefinition, ToolResult } from '../types';
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

/**
 * Formatea un error de Zod en un mensaje legible.
 * @param error - Error de validación de Zod.
 * @returns Mensaje con cada problema separado por " | ".
 */
function formatZodError(error: z.ZodError): string {
  return error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join(' | ');
}

/**
 * Ejecuta una tool por nombre contra el mundo simulado.
 *
 * Nunca lanza: los errores de validación o ejecución se devuelven como `ok: false`.
 *
 * @param name - Nombre de la tool a ejecutar.
 * @param args - Argumentos sin validar; la tool los valida con su esquema Zod.
 * @param world - Mundo simulado sobre el que opera la tool.
 * @returns Resultado de la tool, exitoso o con error controlado.
 * @example
 * const result = await runTool('db.query', { table: 'usuarios' }, world);
 * // result.ok → true
 */
export async function runTool(name: string, args: unknown, world: SimulatedWorld): Promise<ToolResult> {
  const tool = TOOLS.find((candidate) => candidate.name === name);

  if (tool === undefined) {
    return { ok: false, error: `Tool desconocida: "${name}".` };
  }

  try {
    return await tool.execute(args, world);
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return { ok: false, error: `Argumentos inválidos: ${formatZodError(error)}` };
    }

    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}
