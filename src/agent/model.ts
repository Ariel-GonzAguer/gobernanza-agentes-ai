// ─── Modelo fake con guion ───

import type { Model, ModelMessage, ModelStep } from './types';

/**
 * Modelo determinista que sigue un guion de pasos predefinido.
 *
 * Sirve para tests y demos sin API keys: cada llamada a `next` devuelve el
 * siguiente paso del guion, sin importar el historial de mensajes.
 * Cuando el guion se agota, responde con un mensaje final neutro.
 *
 * @example
 * const model = new FakeModel([{ kind: 'final', content: 'Hola' }]);
 * const step = await model.next([]);
 * // step → { kind: 'final', content: 'Hola' }
 */
export class FakeModel implements Model {
  private readonly script: ModelStep[];
  private cursor = 0;

  /** Historial de mensajes que recibió el modelo en cada turno (útil para aserciones). */
  public readonly receivedMessages: ModelMessage[][] = [];

  /**
   * @param script - Secuencia de pasos que el modelo devolverá en orden.
   */
  constructor(script: ModelStep[]) {
    this.script = [...script];
  }

  /**
   * Devuelve el siguiente paso del guion.
   * @param messages - Historial de mensajes de la conversación.
   * @returns El paso correspondiente al cursor actual (o un final neutro si el guion se agotó).
   */
  public async next(messages: ModelMessage[]): Promise<ModelStep> {
    this.receivedMessages.push([...messages]);

    const step = this.script[this.cursor];
    this.cursor += 1;

    if (step === undefined) {
      return { kind: 'final', content: 'Guion agotado: no quedan acciones pendientes.' };
    }

    return step;
  }
}
