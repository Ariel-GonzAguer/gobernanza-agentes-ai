# Fases — bitácora del laboratorio

**Estado actual**: Fase 0 cerrada (2026-09-12) — siguiente: Fase 1 (policy engine).
**Rama**: `feature/governance-layer` · **Plan**: ver [`PLAN.md`](../PLAN.md).

## Tabla de fases

| # | Fase | Entregable | Estado |
|---|------|-----------|--------|
| 0 | Scaffold + agente de juguete | FakeModel, tools simuladas, loop, demo | cerrada |
| 1 | Policy engine | políticas YAML, default-deny, gate en el loop | pendiente |
| 2 | Identidad y confianza | Ed25519 + DID, capacidades, delegación, trust score | pendiente |
| 3 | Guardrails I/O | sanitize/validate, anti-injection, PII | pendiente |
| 4 | Auditoría | hash-chain, verify(), export | pendiente |
| 5 | Límites y HITL | rate limit, presupuesto, circuit breaker, aprobaciones | pendiente |
| 6 | Integración + estándares | GovernanceGate, demo de incidente, mapeo OWASP/NIST | pendiente |

## Bitácora

- **2026-09-12** — Proyecto creado y Fase 0 cerrada: scaffold, agente de juguete, 10 tests en verde y demo ejecutable.

## Cómo retomar

1. Abre `PLAN.md` y esta tabla.
2. La fase con estado "en curso" o la primera "pendiente" es la siguiente.
3. Al cerrar una fase aquí queda registrado el cierre (con fecha).
