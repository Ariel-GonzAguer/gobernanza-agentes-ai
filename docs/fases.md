# Fases — bitácora del laboratorio

**Estado actual**: Fase 0 (scaffold + agente de juguete) — en curso.
**Rama**: `feature/governance-layer` · **Plan**: ver [`PLAN.md`](../PLAN.md).

## Tabla de fases

| # | Fase | Entregable | Estado |
|---|------|-----------|--------|
| 0 | Scaffold + agente de juguete | FakeModel, tools simuladas, loop, demo | en curso |
| 1 | Policy engine | políticas YAML, default-deny, gate en el loop | pendiente |
| 2 | Identidad y confianza | Ed25519 + DID, capacidades, delegación, trust score | pendiente |
| 3 | Guardrails I/O | sanitize/validate, anti-injection, PII | pendiente |
| 4 | Auditoría | hash-chain, verify(), export | pendiente |
| 5 | Límites y HITL | rate limit, presupuesto, circuit breaker, aprobaciones | pendiente |
| 6 | Integración + estándares | GovernanceGate, demo de incidente, mapeo OWASP/NIST | pendiente |

## Bitácora

- **2026-09-12** — Proyecto creado. Fase 0 en curso: scaffold, agente de juguete y tests.

## Cómo retomar

1. Abre `PLAN.md` y esta tabla.
2. La fase con estado "en curso" o la primera "pendiente" es la siguiente.
3. Al cerrar una fase aquí queda registrado el cierre (con fecha).
