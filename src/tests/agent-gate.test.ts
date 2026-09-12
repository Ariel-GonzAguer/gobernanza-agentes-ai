// ─── Tests del loop del agente con gate de decisiones ───

import { describe, expect, test } from 'vitest';
import { runAgent } from '../agent/agent-loop';
import { FakeModel } from '../agent/model';
import { createWorld } from '../agent/tools/world';
import { PolicyEngine } from '../governance/policy/engine';

describe('loop del agente con gate', () => {
  test('no ejecuta una tool call denegada y la registra como bloqueada', async () => {
    const world = createWorld();
    const model = new FakeModel([
      { kind: 'tool_call', call: { id: 'call-1', name: 'db.drop', args: { table: 'usuarios' } } },
      { kind: 'final', content: 'No pude vaciar la tabla: está prohibido.' },
    ]);
    const gate = new PolicyEngine([{ id: 'prohibido-borrar', tool: 'db.drop', effect: 'deny' }]);

    const result = await runAgent({ model, world, task: 'Vacía la tabla usuarios', gate });

    expect(result.executedToolCalls).toHaveLength(0);
    expect(result.blockedToolCalls).toHaveLength(1);
    expect(result.blockedToolCalls[0]?.call.name).toBe('db.drop');
    expect(result.blockedToolCalls[0]?.decision.effect).toBe('deny');
    expect(world.db.rows).toHaveLength(3);
    expect(result.final).toBe('No pude vaciar la tabla: está prohibido.');
  });

  test('deja en espera una acción que requiere aprobación humana', async () => {
    const world = createWorld();
    const model = new FakeModel([
      {
        kind: 'tool_call',
        call: {
          id: 'call-1',
          name: 'email.send',
          args: { to: 'externo@example.com', subject: 'Propuesta', body: 'Adjunto la propuesta.' },
        },
      },
      { kind: 'final', content: 'El correo quedó pendiente de aprobación.' },
    ]);
    const gate = new PolicyEngine([{ id: 'revisar-externos', tool: 'email.send', effect: 'require_approval' }]);

    const result = await runAgent({ model, world, task: 'Avisa al cliente externo', gate });

    expect(result.executedToolCalls).toHaveLength(0);
    expect(result.blockedToolCalls).toHaveLength(1);
    expect(result.blockedToolCalls[0]?.decision.effect).toBe('require_approval');
    expect(world.emails).toHaveLength(0);
    expect(result.final).toBe('El correo quedó pendiente de aprobación.');
  });

  test('le cuenta al modelo el motivo del bloqueo', async () => {
    const world = createWorld();
    const model = new FakeModel([
      { kind: 'tool_call', call: { id: 'call-1', name: 'db.drop', args: { table: 'usuarios' } } },
      { kind: 'final', content: 'Entendido: busco otra vía.' },
    ]);
    const gate = new PolicyEngine([{ id: 'prohibido-borrar', tool: 'db.drop', effect: 'deny' }]);

    await runAgent({ model, world, task: 'Vacía la tabla usuarios', gate });

    const ultimosMensajes = model.receivedMessages.at(-1) ?? [];
    const mensajeDeTool = ultimosMensajes.find((message) => message.role === 'tool');

    expect(mensajeDeTool?.content.toLowerCase()).toContain('denegada');
  });

  test('un gate que permite deja ejecutar la tool con normalidad', async () => {
    const world = createWorld();
    const model = new FakeModel([
      { kind: 'tool_call', call: { id: 'call-1', name: 'db.query', args: { table: 'usuarios' } } },
      { kind: 'final', content: 'Consulté la tabla.' },
    ]);
    const gate = new PolicyEngine([{ id: 'permitir-consulta', tool: 'db.query', effect: 'allow' }]);

    const result = await runAgent({ model, world, task: 'Consulta la tabla usuarios', gate });

    expect(result.executedToolCalls).toHaveLength(1);
    expect(result.executedToolCalls[0]?.result.ok).toBe(true);
    expect(result.blockedToolCalls).toHaveLength(0);
  });

  test('sin gate el loop ejecuta como siempre y no bloquea nada', async () => {
    const world = createWorld();
    const model = new FakeModel([
      { kind: 'tool_call', call: { id: 'call-1', name: 'db.drop', args: { table: 'usuarios' } } },
      { kind: 'final', content: 'Listo.' },
    ]);

    const result = await runAgent({ model, world, task: 'Vacía la tabla usuarios' });

    expect(result.executedToolCalls).toHaveLength(1);
    expect(result.blockedToolCalls).toHaveLength(0);
    expect(world.db.rows).toHaveLength(0);
  });

  test('el gate evalúa argumentos canónicos y no campos autodeclarados descartados por Zod', async () => {
    const world = createWorld();
    const model = new FakeModel([
      {
        kind: 'tool_call',
        call: {
          id: 'call-1',
          name: 'files.write',
          args: { path: 'secreto.md', content: 'dato', rolAutodeclarado: 'admin' },
        },
      },
      { kind: 'final', content: 'La escritura no fue autorizada.' },
    ]);
    const gate = new PolicyEngine([
      {
        id: 'no-confiar-en-rol-del-modelo',
        tool: 'files.write',
        effect: 'allow',
        conditions: [{ op: '==', path: 'args.rolAutodeclarado', value: 'admin' }],
      },
    ]);

    const result = await runAgent({ model, world, task: 'Escribe el archivo', gate });

    expect(result.executedToolCalls).toHaveLength(0);
    expect(result.blockedToolCalls[0]?.decision.effect).toBe('deny');
    expect(result.blockedToolCalls[0]?.call.args).toEqual({ path: 'secreto.md', content: 'dato' });
    expect(world.files.has('secreto.md')).toBe(false);
  });
});
