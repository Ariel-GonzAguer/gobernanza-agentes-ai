# Gobernanza de Agentes de IA — Plan del laboratorio (TypeScript)

**Proyecto**: `governace-ai-agents`
**Ruta**: `C:\Users\arieg\OneDrive\Escritorio\Ariel\projects\2026-proyectos\experimental-y-otros\governace-ai-agents`
**Fecha**: 2026-09-12 · **Copia canónica**: `~/.commandcode/plans/gobernanza-agentes-ia-lab.md`

> Nota: la carpeta se llama `governace-ai-agents` (así la creaste; parece typo de "governance"). El plan la usa tal cual — renombrarla sigue siendo barato mientras no haya remoto ni referencias externas.

## Cómo se aprende

- Proyecto por fases, **estrictamente secuencial**: una fase se cierra (tests verdes + typecheck + commit) antes de abrir la siguiente.
- Cada fase tiene entregable mínimo, tests propios y demo ejecutable.
- Un **commit por fase cerrada** en la rama `feature/governance-layer` (`main` guarda el scaffold).
- Los apuntes viven en `docs/conceptos.md`; la bitácora de fases en `docs/fases.md`.
- Todo TypeScript: cero Python en el laboratorio.

## Decisiones de setup

| Tema | Decisión | Razón |
|---|---|---|
| Runtime | Node ≥ 20 (tienes v24.18.0) + TypeScript strict | strict con `noUncheckedIndexedAccess` y `exactOptionalPropertyTypes` |
| Deps runtime | `zod` + `yaml` | Zod acordado; YAML es el formato de políticas del ecosistema (AGT usa YAML/Rego/Cedar) |
| Deps dev | `typescript`, `vitest`, `tsx`, `@types/node` | mínimo indispensable |
| Cripto | `node:crypto` | Ed25519 y SHA-256 nativos: cero dependencias (fases 2 y 4) |
| Package manager | pnpm | preferencia del proyecto |
| Git | `main` + `feature/governance-layer` | convención para features multi-fase |
| Calidad por fase | `pnpm test` + `pnpm typecheck` verdes | no se avanza con la suite roja |

## Estructura objetivo

```
governace-ai-agents/
├─ PLAN.md                  # este plan (para retomar cualquier día)
├─ README.md                # qué es y cómo correrlo
├─ package.json / tsconfig.json / vitest.config.ts
├─ policies/                # políticas YAML (Fase 1+)
├─ docs/
│  ├─ fases.md              # estado por fase (bitácora)
│  ├─ conceptos.md          # apuntes: modelo mental, conceptos, estándares
│  └─ owasp-asi-mapping.md  # controles → OWASP ASI 2026 / NIST (Fase 6)
└─ src/
   ├─ agent/                # el agente a gobernar
   │  ├─ types.ts           # tipos compartidos
   │  ├─ model.ts           # interfaz Model + FakeModel determinista
   │  ├─ agent-loop.ts      # loop de tool calls
   │  └─ tools/             # tools de juguete (search, files, email, db)
   ├─ governance/           # LA CAPA DE GOBERNANZA (fases 1-6)
   │  ├─ policy/            # policy engine + condiciones (Fase 1)
   │  ├─ identity/          # Ed25519 + DID + capacidades + delegación (Fase 2)
   │  ├─ trust/             # trust score, tiers, decay (Fase 2)
   │  ├─ guardrails/        # sanitize/validate, PII, anti-injection (Fase 3)
   │  ├─ audit/             # hash-chain + verify + export (Fase 4)
   │  ├─ limits/            # rate limit, presupuesto, circuit breaker (Fase 5)
   │  ├─ approvals/         # HITL: aprobaciones (Fase 5)
   │  └─ gate/              # GovernanceGate: pipeline completo (Fase 6)
   ├─ demo/                 # escenarios ejecutables
   └─ tests/                # Vitest (tests en español, describen comportamiento)
```

## Fases

### Fase 0 — Scaffold + agente de juguete

**Objetivo**: tener un agente simple y determinista al que gobernar después.
**Entregable**: `FakeModel` con guion, 6 tools simuladas (`search.web`, `files.read`, `files.write`, `email.send`, `db.query`, `db.drop`), loop con límite de iteraciones y demo ejecutable.
**Tests**: el loop ejecuta tools y devuelve final; tool desconocida → error controlado; límite de iteraciones; estado compartido entre tools; Zod rechaza args inválidos.
**Cierre**: `pnpm demo` + `pnpm test` verdes.

### Fase 1 — Policy engine (allow/deny/require_approval)

**Objetivo**: decidir *antes* de ejecutar: ¿esta acción está permitida?
**Entregable**: tipos de política, carga de YAML con validación Zod, mini-lenguaje de condiciones (`==`, `!=`, `in`, `and`/`or`, paths anidados), evaluación por prioridad, **default-deny (fail-closed)** y hook del gate en el loop del agente.
**Tests**: tabla por operador; default-deny; wildcard; prioridad; tool bloqueada no ejecuta; YAML inválido falla claro; `require_approval` aún no ejecuta (se resuelve en Fase 5).
**Cierre**: demo con `db.drop` denegado y `email.send` en revisión.

### Fase 2 — Identidad y confianza

**Objetivo**: saber *qué agente* hace cada cosa.
**Entregable**: `AgentIdentity` con Ed25519 nativo (`node:crypto`), DID `did:lab:<id>:<fingerprint>`, capacidades con wildcard, delegación (hijo ⊆ padre, con profundidad) y revocación; `TrustManager` con score, tiers y decay (reloj inyectable).
**Tests**: firma/verificación y detección de tampering; delegación no amplifica permisos; identidad revocada se bloquea; decay determinista con reloj falso.
**Nota honesta**: DID didáctico (no spec-compliant); Ed25519 vía `node:crypto` (sin dependencias).

### Fase 3 — Guardrails de entrada/salida

**Objetivo**: sanear y validar todo lo que entra y sale.
**Entregable**: pipeline `sanitize → validate → si hay injection: log → process`; strip de caracteres de control (preservando `\n \t \r`); truncado de líneas largas y tamaño total; detección heurística de prompt-injection (se loguea a auditoría, no se rechaza automáticamente); redacción de PII en logs/salidas; validación Zod de argumentos por tool.
**Tests**: control chars eliminados; línea gigante truncada; injection logueada pero procesada; PII redactada; args inválidos no ejecutan.
**Nota honesta**: la detección de injection es heurística y no garantiza nada — los controles deterministas son los de política/identidad/auditoría.

### Fase 4 — Auditoría tamper-evident

**Objetivo**: poder *probar* qué pasó.
**Entregable**: `AuditLogger` con hash-chain SHA-256 (`node:crypto`), génesis de 64 ceros, `verify()`, filtros (agente, acción, fecha), export JSON y límite de entradas con evicción. El gate escribe **siempre** (allow y deny).
**Tests**: cadena válida; alterar una entrada rompe `verify()`; filtros; export; evicción.

### Fase 5 — Límites y HITL

**Objetivo**: que el agente no pueda desbocarse ni actuar sobre lo irreversible sin humano.
**Entregable**: rate limiter por (agente, acción) con límites declarados en la política (`limit: 'N/hour'`); presupuesto de tokens por sesión; circuit breaker por tool; cola de aprobaciones (`require_approval` → approve/deny/timeout) con operador simulado en la demo.
**Tests**: límite corta en N+1; presupuesto corta; circuito abre/cierra; aprobación permite ejecución diferida; timeout rechaza.

### Fase 6 — Integración, estándares y demo de incidente

**Objetivo**: cerrar el modelo mental completo y mapearlo a estándares.
**Entregable**: `GovernanceGate` orquestando el pipeline (guardrails → identidad → trust → política → límites → ejecución → auditoría → guardrails de salida); errores tipados; demo de incidente (prompt injection, tool misuse, agente desbocado con cuarentena, flujo feliz auditado); `docs/owasp-asi-mapping.md` con mapeo honesto control → ASI01–ASI10 + NIST AI RMF.
**Opcional (si hay ganas)**: comparar la misma política YAML contra `@microsoft/agent-governance-sdk`; adapter a un LLM real (el laboratorio es 100% determinista, sin API keys).

## Protocolo para retomar

1. Lee `docs/fases.md` (estado actual) y este `PLAN.md`.
2. Pide: "continuemos con la Fase N".
3. Al cerrar cada fase: `pnpm test` + `pnpm typecheck` verdes → commit → actualizar `docs/fases.md`.

## Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Alcance grande (7 fases) | cada fase es mínima y cerrable; el estado queda documentado + commiteado |
| Tests frágiles por tiempo/aleatorio | reloj inyectable y modelo fake determinista (sin llamadas de red) |
| Fricción con Ed25519/YAML | `node:crypto` nativo y una sola dep de parseo; si YAML molesta, JSON queda como plan B |
| Windows + scripts | scripts npm cross-platform (tsx/node), sin bash |
| Sentirse "de juguete" | el fake es intencional para tests; al final hay opción de adapter real y comparación con AGT |

## Referencias

- [Agent Governance Toolkit (Microsoft)](https://github.com/microsoft/agent-governance-toolkit) · [docs](https://microsoft.github.io/agent-governance-toolkit/) · [tutorial SDK TypeScript](https://microsoft.github.io/agent-governance-toolkit/tutorials/20-typescript-sdk/)
- [OWASP Top 10 for Agentic Applications 2026](https://genai.owasp.org/resource/owasp-top-10-for-agentic-applications-for-2026/)
- [Mapeo OWASP ASI del AGT](https://github.com/microsoft/agent-governance-toolkit/blob/main/docs/compliance/owasp-agentic-top10-architecture.md)
- [NIST AI RMF](https://www.nist.gov/itl/ai-risk-management-framework)
- [OpenAI Agents SDK (TypeScript)](https://openai.github.io/openai-agents-js/) — para comparar guardrails de framework
- [Zod](https://zod.dev) · [Vitest](https://vitest.dev) · [node:crypto](https://nodejs.org/api/crypto.html)

---

*Plan aprobado el 2026-09-12; se actualiza si una fase cambia de alcance.*
