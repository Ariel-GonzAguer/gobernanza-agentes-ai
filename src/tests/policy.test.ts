// ─── Tests del motor de políticas ───

import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import type { ToolCall } from '../agent/types';
import { PolicyEngine, parsePolicyYaml } from '../governance/policy/engine';
import type { PolicyRule } from '../governance/policy/types';

/** Construye una tool call de prueba. */
function call(name: string, args: Record<string, unknown> = {}): ToolCall {
  return { id: 'call-test', name, args };
}

/** Construye un motor con una sola regla. */
function engineWith(rule: PolicyRule): PolicyEngine {
  return new PolicyEngine([rule]);
}

describe('motor de políticas', () => {
  test('permite una acción cuando una regla allow coincide con la tool', () => {
    const engine = engineWith({ id: 'permitir-lectura', tool: 'files.read', effect: 'allow' });

    const decision = engine.evaluate(call('files.read', { path: 'notas.md' }));

    expect(decision.effect).toBe('allow');
    expect(decision.ruleId).toBe('permitir-lectura');
    expect(decision.reason).not.toBe('');
  });

  test('deniega por defecto cuando ninguna regla permite la acción', () => {
    const engine = engineWith({ id: 'permitir-lectura', tool: 'files.read', effect: 'allow' });

    const decision = engine.evaluate(call('db.drop', { table: 'usuarios' }));

    expect(decision.effect).toBe('deny');
    expect(decision.ruleId).toBeNull();
    expect(decision.reason).toMatch(/sin regla/i);
  });

  test('sin reglas cargadas, toda acción se deniega', () => {
    const engine = new PolicyEngine([]);

    expect(engine.evaluate(call('files.read', { path: 'notas.md' })).effect).toBe('deny');
  });

  test('el comodín global "*" alcanza a cualquier tool', () => {
    const engine = engineWith({ id: 'todo-permitido', tool: '*', effect: 'allow' });

    expect(engine.evaluate(call('search.web', { query: 'gobernanza' })).effect).toBe('allow');
    expect(engine.evaluate(call('db.drop', { table: 'usuarios' })).effect).toBe('allow');
  });

  test('el comodín de prefijo "db.*" solo alcanza a esa familia de tools', () => {
    const engine = engineWith({ id: 'base-de-datos-permitida', tool: 'db.*', effect: 'allow' });

    expect(engine.evaluate(call('db.query', { table: 'usuarios' })).effect).toBe('allow');
    expect(engine.evaluate(call('db.drop', { table: 'usuarios' })).effect).toBe('allow');
    expect(engine.evaluate(call('files.read', { path: 'notas.md' })).effect).toBe('deny');
  });

  test('la prioridad mayor decide aunque la regla aparezca después', () => {
    const engine = new PolicyEngine([
      { id: 'permitir-todo', tool: '*', effect: 'allow', priority: 10 },
      { id: 'prohibir-borrado', tool: 'db.*', effect: 'deny', priority: 100 },
    ]);

    expect(engine.evaluate(call('db.drop', { table: 'usuarios' })).effect).toBe('deny');
    expect(engine.evaluate(call('db.query', { table: 'usuarios' })).effect).toBe('allow');
  });

  test('con prioridades empatadas decide la primera regla declarada', () => {
    const engine = new PolicyEngine([
      { id: 'primera', tool: 'db.*', effect: 'deny', priority: 50 },
      { id: 'segunda', tool: 'db.*', effect: 'allow', priority: 50 },
    ]);

    expect(engine.evaluate(call('db.query', { table: 'usuarios' })).ruleId).toBe('primera');
  });

  test('devuelve require_approval tal cual, sin ejecutar nada', () => {
    const engine = engineWith({ id: 'revisar-correo', tool: 'email.send', effect: 'require_approval' });

    const decision = engine.evaluate(call('email.send', { to: 'externo@example.com' }));

    expect(decision.effect).toBe('require_approval');
    expect(decision.ruleId).toBe('revisar-correo');
  });
});

describe('condiciones de política', () => {
  test('"==" compara con el valor del path indicado', () => {
    const engine = engineWith({
      id: 'solo-usuarios',
      tool: 'db.*',
      effect: 'allow',
      conditions: [{ op: '==', path: 'args.table', value: 'usuarios' }],
    });

    expect(engine.evaluate(call('db.query', { table: 'usuarios' })).effect).toBe('allow');
    expect(engine.evaluate(call('db.query', { table: 'clientes' })).effect).toBe('deny');
  });

  test('"!=" exige que el valor sea distinto', () => {
    const engine = engineWith({
      id: 'solo-externos',
      tool: 'email.send',
      effect: 'require_approval',
      conditions: [{ op: '!=', path: 'args.to', value: 'equipo@example.com' }],
    });

    expect(engine.evaluate(call('email.send', { to: 'externo@example.com' })).effect).toBe('require_approval');
    expect(engine.evaluate(call('email.send', { to: 'equipo@example.com' })).effect).toBe('deny');
  });

  test('"in" acepta una lista de valores', () => {
    const engine = engineWith({
      id: 'tablas-conocidas',
      tool: 'db.*',
      effect: 'allow',
      conditions: [{ op: 'in', path: 'args.table', values: ['usuarios', 'clientes'] }],
    });

    expect(engine.evaluate(call('db.query', { table: 'clientes' })).effect).toBe('allow');
    expect(engine.evaluate(call('db.query', { table: 'secretos' })).effect).toBe('deny');
  });

  test('"and" exige que se cumplan todas las condiciones', () => {
    const engine = engineWith({
      id: 'lectura-acotada',
      tool: 'files.read',
      effect: 'allow',
      conditions: [
        {
          op: 'and',
          conditions: [
            { op: '==', path: 'tool', value: 'files.read' },
            { op: '==', path: 'args.path', value: 'notas.md' },
          ],
        },
      ],
    });

    expect(engine.evaluate(call('files.read', { path: 'notas.md' })).effect).toBe('allow');
    expect(engine.evaluate(call('files.read', { path: 'otro.md' })).effect).toBe('deny');
  });

  test('"or" se cumple con al menos una condición', () => {
    const engine = engineWith({
      id: 'destinatarios-internos',
      tool: 'email.send',
      effect: 'allow',
      conditions: [
        {
          op: 'or',
          conditions: [
            { op: '==', path: 'args.to', value: 'equipo@example.com' },
            { op: '==', path: 'args.to', value: 'soporte@example.com' },
          ],
        },
      ],
    });

    expect(engine.evaluate(call('email.send', { to: 'equipo@example.com' })).effect).toBe('allow');
    expect(engine.evaluate(call('email.send', { to: 'soporte@example.com' })).effect).toBe('allow');
    expect(engine.evaluate(call('email.send', { to: 'externo@example.com' })).effect).toBe('deny');
  });

  test('resuelve paths anidados dentro de los argumentos', () => {
    const engine = engineWith({
      id: 'solo-pdf',
      tool: 'reports.generate',
      effect: 'allow',
      conditions: [{ op: '==', path: 'args.options.format', value: 'pdf' }],
    });

    expect(engine.evaluate(call('reports.generate', { options: { format: 'pdf' } })).effect).toBe('allow');
    expect(engine.evaluate(call('reports.generate', { options: { format: 'html' } })).effect).toBe('deny');
  });

  test('un path inexistente no cumple la condición, ni siquiera con "!="', () => {
    const engine = engineWith({
      id: 'solo-externos',
      tool: 'email.send',
      effect: 'allow',
      conditions: [{ op: '!=', path: 'args.to', value: 'equipo@example.com' }],
    });

    expect(engine.evaluate(call('email.send', {})).effect).toBe('deny');
  });

  test('un path heredado del prototipo no cuenta como contexto autorizado', () => {
    const inheritedArgs = Object.create({ rol: 'admin' }) as Record<string, unknown>;
    const engine = engineWith({
      id: 'solo-admins',
      tool: 'reports.generate',
      effect: 'allow',
      conditions: [{ op: '==', path: 'args.rol', value: 'admin' }],
    });

    expect(engine.evaluate(call('reports.generate', inheritedArgs)).effect).toBe('deny');
  });

  test('"and" sin condiciones no permite nada (fail-closed)', () => {
    const engine = engineWith({
      id: 'regla-rota',
      tool: 'db.*',
      effect: 'allow',
      conditions: [{ op: 'and', conditions: [] }],
    });

    expect(engine.evaluate(call('db.query', { table: 'usuarios' })).effect).toBe('deny');
  });

  test('una regla sin condiciones aplica siempre que la tool coincida', () => {
    const engine = engineWith({ id: 'sin-condiciones', tool: 'db.*', effect: 'allow' });

    expect(engine.evaluate(call('db.drop', { table: 'usuarios' })).effect).toBe('allow');
  });
});

describe('carga de políticas YAML', () => {
  test('parsea un documento válido con reglas y condiciones', () => {
    const source = `
version: 1
rules:
  - id: permitir-lectura
    tool: files.read
    effect: allow
  - id: revisar-correo-externo
    tool: email.send
    effect: require_approval
    priority: 80
    conditions:
      - op: "!="
        path: args.to
        value: equipo@example.com
`;

    const document = parsePolicyYaml(source);

    expect(document.version).toBe(1);
    expect(document.rules).toHaveLength(2);
    expect(document.rules[0]?.effect).toBe('allow');
    expect(document.rules[1]?.effect).toBe('require_approval');
    expect(document.rules[1]?.conditions).toHaveLength(1);
  });

  test('falla con un mensaje claro si falta la versión', () => {
    expect(() => parsePolicyYaml('rules: []')).toThrow(/política inválida/i);
  });

  test('falla con un mensaje claro si el efecto no es conocido', () => {
    const source = 'version: 1\nrules:\n  - id: rota\n    tool: db.*\n    effect: bloquear\n';

    expect(() => parsePolicyYaml(source)).toThrow(/política inválida/i);
  });

  test('falla con un mensaje claro si el YAML tiene un error de sintaxis', () => {
    expect(() => parsePolicyYaml('version: 1\nrules: [sin cerrar')).toThrow(/yaml/i);
  });
});

describe('política de ejemplo del laboratorio', () => {
  const source = readFileSync(new URL('../../policies/lab-policy.yaml', import.meta.url), 'utf8');
  const engine = PolicyEngine.fromYaml(source);

  test('permite leer archivos y buscar en la web', () => {
    expect(engine.evaluate(call('files.read', { path: 'notas.md' })).effect).toBe('allow');
    expect(engine.evaluate(call('search.web', { query: 'owasp agentic' })).effect).toBe('allow');
  });

  test('deniega la acción destructiva y las tools sin regla (default-deny)', () => {
    expect(engine.evaluate(call('db.drop', { table: 'usuarios' })).effect).toBe('deny');
    expect(engine.evaluate(call('db.query', { table: 'usuarios' })).effect).toBe('deny');
    expect(engine.evaluate(call('files.write', { path: 'x.md', content: 'hola' })).effect).toBe('deny');
  });

  test('manda a revisión los correos externos y permite los internos', () => {
    expect(engine.evaluate(call('email.send', { to: 'externo@example.com' })).effect).toBe('require_approval');
    expect(engine.evaluate(call('email.send', { to: 'equipo@example.com' })).effect).toBe('allow');
  });
});
