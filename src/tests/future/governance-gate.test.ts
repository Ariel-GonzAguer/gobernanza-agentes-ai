// ─── Tests del gate de gobernanza ───

import { describe, expect, test } from 'vitest';
import type { ToolCall } from '../../agent/types';
import { AgentIdentity } from '../../governance/identity/identity';
import { AuditLogger } from '../../governance/audit/logger';
import { createGuardrailPipeline } from '../../governance/guardrails/pipeline';
import { GovernanceGate } from '../../governance/gate/governance-gate';
import { PolicyEngine } from '../../governance/policy/engine';
import { TrustManager } from '../../governance/trust/manager';

/** Construye una call de lectura para los escenarios del gate. */
function readCall(): ToolCall {
  return { id: 'call-1', name: 'files.read', args: { path: 'notas.md' } };
}

/** Construye las dependencias mínimas de un gate. */
function createGate(identity = AgentIdentity.generate('reporter', ['files.read'])): GovernanceGate {
  return new GovernanceGate({
    policy: new PolicyEngine([{ id: 'permitir-lectura', tool: 'files.read', effect: 'allow' }]),
    identity,
    trust: new TrustManager(),
    guardrails: createGuardrailPipeline(),
    audit: new AuditLogger(),
    sessionId: 'session-1',
    policyVersion: 'policy-1',
    policyHash: 'hash-1',
  });
}

describe('gate de gobernanza', () => {
  test('permite una call con identidad, capacidad y política compatibles', () => {
    const gate = createGate();

    expect(gate.evaluate(readCall()).effect).toBe('allow');
  });

  test('bloquea una identidad revocada', () => {
    const identity = AgentIdentity.generate('reporter', ['files.read']);
    identity.revoke();
    const gate = createGate(identity);

    expect(gate.evaluate(readCall()).effect).toBe('deny');
  });

  test('bloquea una identidad sin la capacidad solicitada', () => {
    const identity = AgentIdentity.generate('reporter', ['search.web']);
    const gate = createGate(identity);

    expect(gate.evaluate(readCall()).effect).toBe('deny');
  });

  test('no trata require_approval como allow', () => {
    const gate = new GovernanceGate({
      policy: new PolicyEngine([{ id: 'revisar', tool: 'files.read', effect: 'require_approval' }]),
      identity: AgentIdentity.generate('reporter', ['files.read']),
      trust: new TrustManager(),
      guardrails: createGuardrailPipeline(),
      audit: new AuditLogger(),
      sessionId: 'session-1',
      policyVersion: 'policy-1',
      policyHash: 'hash-1',
    });

    expect(gate.evaluate(readCall()).effect).toBe('require_approval');
  });

  test('trata la salida y deja evidencia de la decisión', () => {
    const audit = new AuditLogger();
    const gate = new GovernanceGate({
      policy: new PolicyEngine([{ id: 'permitir-lectura', tool: 'files.read', effect: 'allow' }]),
      identity: AgentIdentity.generate('reporter', ['files.read']),
      trust: new TrustManager(),
      guardrails: createGuardrailPipeline(),
      audit,
      sessionId: 'session-1',
      policyVersion: 'policy-1',
      policyHash: 'hash-1',
    });
    const decision = gate.evaluate(readCall());
    const result = gate.afterExecution(readCall(), decision, {
      ok: true,
      output: 'Contacto alice@example.com',
    });

    expect(String(result.output)).not.toContain('alice@example.com');
    expect(audit.entries().length).toBeGreaterThan(0);
    expect(audit.verify()).toBe(true);
  });
});
