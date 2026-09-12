// ─── Tests de identidad de agentes ───

import { describe, expect, test } from 'vitest';
import { AgentIdentity } from '../../governance/identity/identity';

describe('identidad de agentes', () => {
  test('firma y verifica un payload sin modificaciones', () => {
    const identity = AgentIdentity.generate('reporter', ['files.read']);

    const proof = identity.sign('payload-de-prueba');

    expect(identity.verify(proof)).toBe(true);
  });

  test('rechaza un payload modificado después de firmarlo', () => {
    const identity = AgentIdentity.generate('reporter', ['files.read']);
    const proof = identity.sign('payload-original');

    expect(identity.verify({ ...proof, payload: 'payload-alterado' })).toBe(false);
  });

  test('rechaza una firma modificada', () => {
    const identity = AgentIdentity.generate('reporter', ['files.read']);
    const proof = identity.sign('payload-original');

    expect(identity.verify({ ...proof, signature: `${proof.signature}00` })).toBe(false);
  });

  test('genera un DID didáctico y no expone la clave privada', () => {
    const identity = AgentIdentity.generate('reporter', ['files.read']);

    expect(identity.record.did).toMatch(/^did:lab:reporter:/);
    expect(identity.record).not.toHaveProperty('privateKey');
  });

  test('resuelve capacidades exactas, por prefijo y globales', () => {
    const identity = AgentIdentity.generate('operator', ['files.read', 'db.*']);

    expect(identity.can('files.read')).toBe(true);
    expect(identity.can('db.query')).toBe(true);
    expect(identity.can('db.drop')).toBe(true);
    expect(identity.can('email.send')).toBe(false);
  });

  test('una delegación solo puede reducir capacidades', () => {
    const identity = AgentIdentity.generate('operator', ['files.read', 'db.query']);
    const child = identity.delegate('worker', ['files.read']);

    expect(child.can('files.read')).toBe(true);
    expect(child.can('db.query')).toBe(false);
    expect(() => identity.delegate('invalid-worker', ['db.drop'])).toThrow();
  });

  test('respeta la profundidad máxima de delegación', () => {
    const identity = AgentIdentity.generate('root', ['files.read'], { maxDelegationDepth: 1 });
    const child = identity.delegate('child', ['files.read']);

    expect(() => child.delegate('grandchild', ['files.read'])).toThrow();
  });

  test('revocar al padre invalida también la cadena descendiente', () => {
    const identity = AgentIdentity.generate('root', ['files.read']);
    const child = identity.delegate('child', ['files.read']);

    identity.revoke();

    expect(identity.can('files.read')).toBe(false);
    expect(child.can('files.read')).toBe(false);
  });
});
