// ─── Tests de aprobaciones humanas ───

import { describe, expect, test } from 'vitest';
import type { ToolCall } from '../../agent/types';
import { ApprovalQueue } from '../../governance/approvals/queue';

/** Construye una call canónica de prueba. */
function call(to = 'externo@example.com'): ToolCall {
  return {
    id: 'call-1',
    name: 'email.send',
    args: { to, subject: 'Informe', body: 'Contenido aprobado.' },
  };
}

describe('cola de aprobaciones', () => {
  test('permite consumir una aprobación exacta una sola vez', () => {
    let now = 0;
    const queue = new ApprovalQueue({ clock: () => now });
    const context = { agentDid: 'did:lab:reporter:fingerprint', call: call(), policyVersion: 'policy-1' };
    const request = queue.request(context, 1000);

    queue.decide(request.id, 'operator-1', true);
    const first = queue.consume(request.id, context);
    const second = queue.consume(request.id, context);

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(false);
    now = 100;
  });

  test('rechaza una call con argumentos distintos', () => {
    const queue = new ApprovalQueue({ clock: () => 0 });
    const context = { agentDid: 'did:lab:reporter:fingerprint', call: call(), policyVersion: 'policy-1' };
    const request = queue.request(context, 1000);
    queue.decide(request.id, 'operator-1', true);

    const changed = queue.consume(request.id, { ...context, call: call('otro@example.com') });

    expect(changed.ok).toBe(false);
  });

  test('rechaza una aprobación expirada', () => {
    let now = 0;
    const queue = new ApprovalQueue({ clock: () => now });
    const context = { agentDid: 'did:lab:reporter:fingerprint', call: call(), policyVersion: 'policy-1' };
    const request = queue.request(context, 100);
    queue.decide(request.id, 'operator-1', true);
    now = 100;

    expect(queue.consume(request.id, context).ok).toBe(false);
  });

  test('rechaza una decisión negativa y conserva el operador', () => {
    const queue = new ApprovalQueue({ clock: () => 0 });
    const context = { agentDid: 'did:lab:reporter:fingerprint', call: call(), policyVersion: 'policy-1' };
    const request = queue.request(context, 1000);
    const decision = queue.decide(request.id, 'operator-2', false);

    expect(decision.operator).toBe('operator-2');
    expect(queue.consume(request.id, context).ok).toBe(false);
  });
});
