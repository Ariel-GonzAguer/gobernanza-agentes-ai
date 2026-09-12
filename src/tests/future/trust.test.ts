// ─── Tests de confianza contextual ───

import { describe, expect, test } from 'vitest';
import { TrustManager } from '../../governance/trust/manager';

describe('confianza contextual', () => {
  test('crea un snapshot con score y tier iniciales', () => {
    const manager = new TrustManager({ initialScore: 50 });

    const snapshot = manager.get('did:lab:reporter:fingerprint');

    expect(snapshot.score).toBe(50);
    expect(snapshot.tier).toBe('medium');
  });

  test('aplica observaciones y limita el score al rango permitido', () => {
    const manager = new TrustManager({ initialScore: 50 });

    expect(manager.observe('agent-a', 30).score).toBe(80);
    expect(manager.observe('agent-a', 100).score).toBe(100);
    expect(manager.observe('agent-a', -150).score).toBe(0);
  });

  test('calcula tiers deterministas', () => {
    const manager = new TrustManager({ initialScore: 50 });

    expect(manager.observe('low-agent', -20).tier).toBe('low');
    expect(manager.observe('high-agent', 30).tier).toBe('high');
  });

  test('aplica decay hacia el score neutral con un reloj inyectado', () => {
    let now = 0;
    const manager = new TrustManager({
      clock: () => now,
      initialScore: 80,
      decayPerHour: 10,
    });

    manager.get('agent-a');
    now = 60 * 60 * 1000;

    expect(manager.get('agent-a').score).toBe(70);
  });

  test('mantiene separados los snapshots de distintos agentes', () => {
    const manager = new TrustManager({ initialScore: 50 });

    manager.observe('agent-a', 20);

    expect(manager.get('agent-a').score).toBe(70);
    expect(manager.get('agent-b').score).toBe(50);
  });
});
