// ─── Tests de auditoría tamper-evident ───

import { describe, expect, test } from 'vitest';
import type { GateEffect } from '../../agent/types';
import { AuditLogger } from '../../governance/audit/logger';
import { digestCanonical } from '../../governance/audit/digest';

/** Construye un evento de auditoría determinista. */
function event(effect: GateEffect = 'allow') {
  return {
    agentDid: 'did:lab:reporter:fingerprint',
    tool: 'files.read',
    argsDigest: 'digest-1',
    effect,
    reason: 'decisión de prueba',
    policyVersion: 'policy-1',
    policyHash: 'hash-1',
  };
}

describe('cadena de auditoría', () => {
  test('verifica una cadena con varias entradas', () => {
    const logger = new AuditLogger({ clock: () => '2026-01-01T00:00:00.000Z' });

    logger.append(event('allow'));
    logger.append(event('deny'));

    expect(logger.verify()).toBe(true);
    expect(logger.entries()).toHaveLength(2);
  });

  test('usa un génesis de 64 ceros', () => {
    const logger = new AuditLogger();
    const entry = logger.append(event());

    expect(entry.previousHash).toBe('0'.repeat(64));
  });

  test('detecta la alteración de una entrada', () => {
    const logger = new AuditLogger();
    logger.append(event());
    logger.append(event());
    const first = logger.entries()[0] as { reason: string };
    first.reason = 'alterado';

    expect(logger.verify()).toBe(false);
  });

  test('produce el mismo digest aunque cambie el orden de propiedades', () => {
    expect(digestCanonical({ b: 2, a: 1 })).toBe(digestCanonical({ a: 1, b: 2 }));
  });

  test('filtra por agente, tool y efecto', () => {
    const logger = new AuditLogger();
    logger.append(event('allow'));
    logger.append({ ...event('deny'), tool: 'db.drop', agentDid: 'did:lab:other:fingerprint' });

    expect(logger.filter({ tool: 'db.drop' })).toHaveLength(1);
    expect(logger.filter({ effect: 'deny' })).toHaveLength(1);
    expect(logger.filter({ agentDid: 'did:lab:reporter:fingerprint' })).toHaveLength(1);
  });

  test('exporta y restaura una cadena verificable', () => {
    const logger = new AuditLogger();
    logger.append(event('deny'));

    const restored = AuditLogger.fromJson(logger.exportJson());

    expect(restored.entries()).toHaveLength(1);
    expect(restored.verify()).toBe(true);
  });
});
