// ─── Tests de límites operativos ───

import { describe, expect, test } from 'vitest';
import { CircuitBreaker } from '../../governance/limits/circuit-breaker';
import { RateLimiter, parseRateLimit } from '../../governance/limits/rate-limiter';
import { TokenBudget } from '../../governance/limits/token-budget';

describe('rate limiter', () => {
  test('interpreta límites declarativos', () => {
    expect(parseRateLimit('10/hour')).toEqual({ max: 10, windowMs: 60 * 60 * 1000 });
  });

  test('rechaza la acción que supera el máximo de la ventana', () => {
    const limiter = new RateLimiter({ clock: () => 0 });
    const limit = parseRateLimit('2/minute');

    expect(limiter.check('agent-a', 'email.send', limit).allowed).toBe(true);
    expect(limiter.check('agent-a', 'email.send', limit).allowed).toBe(true);
    expect(limiter.check('agent-a', 'email.send', limit).allowed).toBe(false);
  });

  test('reinicia el contador al comenzar una ventana nueva', () => {
    let now = 0;
    const limiter = new RateLimiter({ clock: () => now });
    const limit = parseRateLimit('1/minute');

    limiter.check('agent-a', 'search.web', limit);
    now = 60 * 1000;

    expect(limiter.check('agent-a', 'search.web', limit).allowed).toBe(true);
  });
});

describe('presupuesto de tokens', () => {
  test('rechaza cuando el consumo supera el límite de la sesión', () => {
    const budget = new TokenBudget(100);

    expect(budget.consume('session-a', 60).allowed).toBe(true);
    expect(budget.consume('session-a', 41).allowed).toBe(false);
    expect(budget.remaining('session-a')).toBe(40);
  });
});

describe('circuit breaker', () => {
  test('abre después del umbral y permite una prueba tras el timeout', () => {
    let now = 0;
    const breaker = new CircuitBreaker({
      failureThreshold: 2,
      resetAfterMs: 1000,
      clock: () => now,
    });

    breaker.record('email.send', { ok: false });
    breaker.record('email.send', { ok: false });
    expect(breaker.before('email.send').allowed).toBe(false);

    now = 1000;
    expect(breaker.before('email.send').state).toBe('half-open');
    breaker.record('email.send', { ok: true });
    expect(breaker.state('email.send')).toBe('closed');
  });
});
