// ─── Tipos compartidos del agente ───

import type { ZodType } from 'zod';

// ─── Mensajes y modelo ───

/** Llamada a una tool solicitada por el modelo. */
export interface ToolCall {
  id: string;
  name: string;
  args: Record<string, unknown>;
}

/** Paso que devuelve el modelo en cada turno: o pide una tool o responde. */
export type ModelStep =
  | { kind: 'tool_call'; call: ToolCall }
  | { kind: 'final'; content: string };

/** Mensaje dentro de la conversación del agente. */
export type ModelMessage =
  | { role: 'user'; content: string }
  | { role: 'assistant'; content: string }
  | { role: 'tool'; toolCallId: string; toolName: string; content: string };

/** Contrato del modelo de lenguaje. La implementación fake permite tests deterministas. */
export interface Model {
  /**
   * Devuelve el siguiente paso de la conversación.
   * @param messages - Historial de mensajes hasta el momento.
   * @returns El siguiente paso: pedir una tool o cerrar con la respuesta final.
   */
  next(messages: ModelMessage[]): Promise<ModelStep>;
}

// ─── Tools ───

/** Resultado de ejecutar una tool. */
export interface ToolResult {
  ok: boolean;
  output?: unknown;
  error?: string;
}

/** Definición de una tool: nombre, esquema Zod y ejecución tipada. */
export interface ToolDefinition<TArgs extends Record<string, unknown> = Record<string, unknown>> {
  name: string;
  description: string;
  schema: ZodType<TArgs>;
  /**
   * Ejecuta la tool sobre el mundo simulado con argumentos ya validados.
   * @param args - Argumentos validados y normalizados por el registro.
   * @param world - Estado simulado sobre el que opera la tool.
   * @returns Resultado de la ejecución.
   */
  execute(args: TArgs, world: SimulatedWorld): Promise<ToolResult> | ToolResult;
}

/** Tool call resuelta y validada, lista para autorizarse y ejecutarse. */
export interface PreparedToolCall {
  /** Call canónica: no contiene campos descartados o transformaciones pendientes. */
  call: ToolCall;
  /** Ejecuta exactamente los argumentos presentes en `call`. */
  execute(world: SimulatedWorld): Promise<ToolResult>;
}

// ─── Mundo simulado ───

/** Correo registrado en el mundo simulado. */
export interface SentEmail {
  to: string;
  subject: string;
  body: string;
  sentAt: string;
}

/** Base de datos simulada: una sola tabla con filas en memoria. */
export interface SimulatedDatabase {
  table: string;
  rows: Record<string, unknown>[];
}

/** Estado simulado sobre el que actúan las tools de juguete. */
export interface SimulatedWorld {
  files: Map<string, string>;
  emails: SentEmail[];
  db: SimulatedDatabase;
}

// ─── Ejecución del agente ───

/** Tool call ya ejecutada, con su resultado. */
export interface ExecutedToolCall {
  call: ToolCall;
  result: ToolResult;
}

/** Resultado de una corrida completa del agente. */
export interface AgentRunResult {
  final: string;
  messages: ModelMessage[];
  executedToolCalls: ExecutedToolCall[];
  iterations: number;
}
