// ─── Loop del agente ───

import { runTool } from './tools/registry';
import type { AgentRunResult, ExecutedToolCall, Model, ModelMessage, SimulatedWorld } from './types';

/** Opciones de una corrida del agente. */
export interface AgentLoopOptions {
  /** Modelo que decide los pasos. */
  model: Model;
  /** Mundo simulado sobre el que actúan las tools. */
  world: SimulatedWorld;
  /** Tarea inicial que recibe el agente. */
  task: string;
  /** Máximo de iteraciones antes de cortar (default: 10). */
  maxIterations?: number;
}

/**
 * Ejecuta el loop del agente: pide pasos al modelo y ejecuta sus tool calls
 * contra el mundo simulado hasta recibir una respuesta final.
 *
 * Limitación conocida: todavía no hay capa de gobernanza — las fases 1+ añaden
 * el gate que decide si una tool call puede ejecutarse.
 *
 * @param options - Modelo, mundo simulado, tarea y límite de iteraciones.
 * @returns Respuesta final, historial completo, tool calls ejecutadas e iteraciones usadas.
 * @throws Error si se supera el límite de iteraciones sin respuesta final.
 * @example
 * const result = await runAgent({ model, world, task: 'Lee notas.md' });
 * // result.final → 'Leí el archivo.'
 */
export async function runAgent(options: AgentLoopOptions): Promise<AgentRunResult> {
  const maxIterations = options.maxIterations ?? 10;
  const messages: ModelMessage[] = [{ role: 'user', content: options.task }];
  const executedToolCalls: ExecutedToolCall[] = [];

  for (let iteration = 1; iteration <= maxIterations; iteration += 1) {
    const step = await options.model.next(messages);

    if (step.kind === 'final') {
      return { final: step.content, messages, executedToolCalls, iterations: iteration };
    }

    messages.push({ role: 'assistant', content: `Llamo a la tool ${step.call.name}` });

    const result = await runTool(step.call.name, step.call.args, options.world);
    executedToolCalls.push({ call: step.call, result });
    messages.push({
      role: 'tool',
      toolCallId: step.call.id,
      toolName: step.call.name,
      content: JSON.stringify(result),
    });
  }

  throw new Error(`Se superó el límite de iteraciones (${maxIterations}) sin respuesta final.`);
}
