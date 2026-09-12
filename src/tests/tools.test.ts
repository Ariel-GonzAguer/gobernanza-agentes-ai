// ─── Tests de las tools simuladas ───

import { describe, expect, test } from 'vitest';
import { runTool } from '../agent/tools/registry';
import { createWorld } from '../agent/tools/world';

describe('tools simuladas', () => {
  test('files.write y files.read comparten el estado simulado', async () => {
    const world = createWorld();

    await runTool('files.write', { path: 'informe.md', content: 'contenido de prueba' }, world);
    const result = await runTool('files.read', { path: 'informe.md' }, world);

    expect(result.ok).toBe(true);
    expect((result.output as { content: string }).content).toBe('contenido de prueba');
  });

  test('files.read devuelve error si el archivo no existe', async () => {
    const world = createWorld();

    const result = await runTool('files.read', { path: 'no-existe.md' }, world);

    expect(result.ok).toBe(false);
    expect(result.error).toContain('no existe');
  });

  test('email.send registra el correo en el mundo simulado', async () => {
    const world = createWorld();

    const result = await runTool(
      'email.send',
      { to: 'equipo@example.com', subject: 'Hola', body: 'Prueba' },
      world,
    );

    expect(result.ok).toBe(true);
    expect(world.emails).toHaveLength(1);
    expect(world.emails[0]?.subject).toBe('Hola');
  });

  test('db.query devuelve las filas de la tabla simulada', async () => {
    const world = createWorld();

    const result = await runTool('db.query', { table: 'usuarios' }, world);

    expect(result.ok).toBe(true);
    expect((result.output as { rows: unknown[] }).rows).toHaveLength(3);
  });

  test('db.drop vacía la tabla (acción destructiva)', async () => {
    const world = createWorld();

    const result = await runTool('db.drop', { table: 'usuarios' }, world);

    expect(result.ok).toBe(true);
    expect(world.db.rows).toHaveLength(0);
  });

  test('valida argumentos con Zod y no ejecuta con args inválidos', async () => {
    const world = createWorld();

    const result = await runTool('search.web', { query: '' }, world);

    expect(result.ok).toBe(false);
    expect(result.error).toContain('Argumentos inválidos');
  });
});
