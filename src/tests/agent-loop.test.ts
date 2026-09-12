// ─── Tests del loop del agente ───

import { describe, expect, test } from 'vitest';
import { runAgent } from '../agent/agent-loop';
import { FakeModel } from '../agent/model';
import { createWorld } from '../agent/tools/world';

describe('runAgent', () => {
  test('ejecuta una tool pedida por el modelo y devuelve la respuesta final', async () => {
    const world = createWorld();
    const model = new FakeModel([
      { kind: 'tool_call', call: { id: 'call-1', name: 'files.read', args: { path: 'notas.md' } } },
      { kind: 'final', content: 'Leí el archivo.' },
    ]);

    const result = await runAgent({ model, world, task: 'Lee notas.md' });

    expect(result.final).toBe('Leí el archivo.');
    expect(result.executedToolCalls).toHaveLength(1);
    expect(result.executedToolCalls[0]?.call.name).toBe('files.read');
    expect(result.executedToolCalls[0]?.result.ok).toBe(true);
    expect(result.iterations).toBe(2);
  });

  test('comparte el estado del mundo entre tool calls consecutivas', async () => {
    const world = createWorld();
    const model = new FakeModel([
      {
        kind: 'tool_call',
        call: { id: 'call-1', name: 'files.write', args: { path: 'salida.txt', content: 'hola mundo' } },
      },
      { kind: 'tool_call', call: { id: 'call-2', name: 'files.read', args: { path: 'salida.txt' } } },
      { kind: 'final', content: 'Listo.' },
    ]);

    const result = await runAgent({ model, world, task: 'Escribe y lee un archivo' });

    const output = result.executedToolCalls[1]?.result.output as { content: string };
    expect(output.content).toBe('hola mundo');
  });

  test('devuelve error controlado si la tool no existe y continúa el loop', async () => {
    const world = createWorld();
    const model = new FakeModel([
      { kind: 'tool_call', call: { id: 'call-1', name: 'tool.inexistente', args: {} } },
      { kind: 'final', content: 'Intenté algo que no existe.' },
    ]);

    const result = await runAgent({ model, world, task: 'Prueba una tool inexistente' });

    expect(result.executedToolCalls[0]?.result.ok).toBe(false);
    expect(result.executedToolCalls[0]?.result.error).toContain('Tool desconocida');
    expect(result.final).toBe('Intenté algo que no existe.');
  });

  test('corta con un error si el modelo supera el límite de iteraciones', async () => {
    const world = createWorld();
    const model = new FakeModel([
      { kind: 'tool_call', call: { id: 'call-1', name: 'files.read', args: { path: 'notas.md' } } },
    ]);

    await expect(runAgent({ model, world, task: 'Nunca termina', maxIterations: 1 })).rejects.toThrow(
      'límite de iteraciones',
    );
  });
});
