# Gobernanza de Agentes de IA — Plan del laboratorio (TypeScript)

**Proyecto**: `governance-ai-agents`
**Fecha de creación**: 2026-09-12 · **Última revisión de referencias**: 2026-09-12
**Copia canónica**: este archivo dentro del repositorio.

## Alcance del aprendizaje

El laboratorio construye un **subconjunto didáctico de gobernanza técnica en runtime**. Enseña a interceptar acciones de un agente y aplicar controles deterministas; no reproduce toda la gobernanza empresarial ni todo el Agent Governance Toolkit.

Antes del código se distingue entre dos niveles complementarios:

| Nivel | Pregunta | Cobertura |
|---|---|---|
| Gobernanza organizacional | ¿Quién decide el propósito, acepta el riesgo y responde por incidentes? | Fase 0A y mapeo final |
| Gobernanza técnica de runtime | ¿Qué acciones se permiten, cómo se limitan y qué evidencia dejan? | Fases 0–6 |

Las referencias externas cambian. Este temario toma como baseline NIST AI RMF 1.0, NIST AI 600-1 y OWASP Top 10 for Agentic Applications 2026, consultados en la fecha indicada. La comparación con AGT debe registrar la versión o commit usado cuando se realice.

## Cómo se aprende (modelo de mentoría)

- **Tú implementas el código de las fases**; el asistente no escribe la capa de gobernanza.
- Por fase, el mantenedor prepara: objetivos de aprendizaje, conceptos y referencias, especificación (tipos, firmas y JSDoc), tests de aceptación (Vitest) y una guía de ejercicio en `docs/fase-N-*.md` con pistas escalonadas. El estudiante implementa el código.
- Ciclo de cada fase: leer conceptos → verificar baseline → ejecutar `test:phaseN` y `typecheck:phaseN` → implementar hasta que los tests de aceptación pasen → revisión con feedback → cierre con commit.
- Proyecto por fases, **estrictamente secuencial**: una fase se cierra (tests verdes + typecheck) antes de abrir la siguiente.
- Un **commit por fase cerrada** en la rama `feature/governance-layer` (`main` guarda el scaffold).
- Fase 0 (agente de juguete): implementada por el asistente y conservada como referencia; el estudiante debe recorrerla antes de iniciar la Fase 1.
- Los apuntes viven en `docs/conceptos.md`; la bitácora en `docs/fases.md`; el mentor portátil en `agents/governance-mentor.md`.
- Todo TypeScript: cero Python en el laboratorio.

## Decisiones de setup

| Tema             | Decisión                                        | Razón                                                                                  |
| ---------------- | ----------------------------------------------- | -------------------------------------------------------------------------------------- |
| Runtime          | Node ≥ 20 (tienes v24.18.0) + TypeScript strict | strict con `noUncheckedIndexedAccess` y `exactOptionalPropertyTypes`                   |
| Deps runtime     | `zod` + `yaml`                                  | Zod acordado; YAML es el formato de políticas del ecosistema (AGT usa YAML/Rego/Cedar) |
| Deps dev         | `typescript`, `vitest`, `tsx`, `@types/node`    | mínimo indispensable                                                                   |
| Cripto           | `node:crypto`                                   | Ed25519 y SHA-256 nativos: cero dependencias (fases 2 y 4)                             |
| Package manager  | pnpm                                            | preferencia del proyecto                                                               |
| Git              | `main` + `feature/governance-layer`             | convención para features multi-fase                                                    |
| Calidad por fase | baseline siempre verde + aceptación rojo→verde  | separa regresiones del trabajo todavía pendiente                                      |

## Estructura objetivo

```
governance-ai-agents/
├─ PLAN.md                  # este plan (para retomar cualquier día)
├─ START-HERE.md            # primera sesión y baseline verificable
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
      └─ future/            # contratos de fases aún no activas, excluidos de la suite por defecto
```

## Fases

### Fase 0A — Contexto, responsabilidad y threat model

**Objetivo**: entender que los controles técnicos responden a decisiones de riesgo previas.
**Entregable de aprendizaje**: una ficha breve con propósito del agente, acciones fuera de alcance, activos afectados, actores, propietario del riesgo, criterios de parada y tres escenarios de abuso.
**Cierre**: explicar qué riesgo reduce cada fase y qué riesgo queda aceptado; no requiere código.

### Fase 0 — Scaffold + agente de juguete

**Objetivo**: tener un agente simple y determinista al que gobernar después.
**Entregable**: `FakeModel` con guion, 6 tools simuladas (`search.web`, `files.read`, `files.write`, `email.send`, `db.query`, `db.drop`), loop con límite de iteraciones y demo ejecutable.
**Tests**: el loop ejecuta tools y devuelve final; tool desconocida → error controlado; límite de iteraciones; estado compartido; Zod rechaza args inválidos; la preparación produce argumentos canónicos.
**Cierre del recorrido**: `pnpm verify:baseline` verde y preguntas de `START-HERE.md` respondidas por el estudiante.

### Fase 1 — Policy engine (allow/deny/require_approval)

**Objetivo**: decidir *antes* de ejecutar: ¿esta acción está permitida?
**Entregable**: tipos de política, carga de YAML con validación Zod, mini-lenguaje de condiciones (`==`, `!=`, `in`, `and`/`or`, paths anidados), evaluación por prioridad, **default-deny (fail-closed)** y hook del gate después de validar y antes de ejecutar.
**Invariante**: `prepareToolCall → política sobre call canónica → prepared.execute`; la política y la tool observan exactamente los mismos argumentos. Identidad, rol y confianza nunca se aceptan desde `args`.
**Tests**: tabla por operador; default-deny; wildcard; prioridad; solo propiedades propias; tool bloqueada no ejecuta; campos descartados no autorizan; YAML inválido falla claro; `require_approval` aún no ejecuta (se resuelve en Fase 5).
**Cierre**: demo con `db.drop` denegado y `email.send` en revisión.

### Fase 2 — Identidad y confianza

**Objetivo**: saber *qué agente* hace cada cosa.
**Entregable**: `AgentIdentity` con Ed25519 nativo (`node:crypto`), DID `did:lab:<id>:<fingerprint>`, capacidades con wildcard, delegación (hijo ⊆ padre, con profundidad) y revocación; `TrustManager` con score, tiers y decay (reloj inyectable).
**Tests**: firma/verificación y detección de tampering; delegación no amplifica permisos; identidad revocada se bloquea; decay determinista con reloj falso.
**Nota honesta**: el DID es didáctico y no cumple una DID Method real. Ed25519 prueba posesión de una clave, no la identidad civil ni la legitimidad del agente. El trust score es una señal para políticas y observación; por sí solo no concede privilegios. La custodia segura de claves queda fuera del laboratorio básico.

### Fase 3 — Guardrails de entrada/salida

**Objetivo**: sanear y validar todo lo que entra y sale.
**Entregable**: pipeline de tratamiento de contenido, separación entre instrucciones y datos no confiables, límites de tamaño, detección heurística de prompt injection, redacción de PII en logs/salidas y validación Zod en la frontera de tools.
**Tests**: control chars eliminados; línea gigante truncada; injection logueada pero procesada; PII redactada; args inválidos no ejecutan.
**Nota honesta**: los prompts y clasificadores aportan defensa en profundidad, pero no son una frontera de autorización. Escapar o sanear texto tampoco neutraliza por sí solo una prompt injection; el control fuerte sigue siendo minimizar capacidades y validar cada efecto.

### Fase 4 — Auditoría tamper-evident

**Objetivo**: poder *probar* qué pasó.
**Entregable**: `AuditLogger` append-only con hash-chain SHA-256 (`node:crypto`), génesis de 64 ceros, `verify()`, filtros y export JSON. El gate escribe **siempre** (allow y deny) e incluye la versión/hash de la política.
**Tests**: cadena válida; alterar una entrada rompe `verify()`; reescribir toda la cadena no se presenta como detectable sin un ancla externa; filtros y export.
**Decisión de alcance**: el ejercicio básico no hace evicción. La rotación opcional usa segmentos y conserva externamente un checkpoint firmado o hash raíz por segmento; nunca corta silenciosamente la cadena verificable.

### Fase 5 — Límites y HITL

**Objetivo**: que el agente no pueda desbocarse ni actuar sobre lo irreversible sin humano.
**Entregable**: rate limiter por (agente, acción) con límites declarados en la política (`limit: 'N/hour'`); presupuesto de tokens por sesión; circuit breaker por tool; cola de aprobaciones con operador simulado.
**Invariante HITL**: cada aprobación se liga criptográficamente o mediante un digest estable al agente, tool, argumentos canónicos, versión de política y expiración; es de un solo uso y registra quién decidió.
**Tests**: límite corta en N+1; presupuesto corta; circuito abre/cierra; aprobación exacta permite ejecución diferida; cambio de argumentos o replay rechaza; timeout rechaza.

### Fase 6 — Integración, estándares y demo de incidente

**Objetivo**: cerrar el modelo mental completo y mapearlo a estándares.
**Entregable**: `GovernanceGate` orquestando el pipeline (normalización de entrada → identidad/trust → política → límites/aprobación → ejecución → auditoría → tratamiento de salida); errores tipados; demo de incidente; `docs/owasp-asi-mapping.md` con mapeo honesto a OWASP y NIST.
**Gobernanza del control**: inventario y propietario de políticas, revisión de cambios, tests, versión activa, rollback y procedimiento break-glass. Una política versionada en Git no queda gobernada solo por estar escrita en YAML.
**Opcional (si hay ganas)**: comparar la misma política YAML contra `@microsoft/agent-governance-sdk`; adapter a un LLM real (el laboratorio es 100% determinista, sin API keys).

## Protocolo para retomar

1. Lee `START-HERE.md`, `docs/fases.md` y este `PLAN.md`.
2. La fase pendiente trae su guía en `docs/fase-N-*.md`: **tú implementas** y pides pistas o revisión cuando quieras.
3. Mantén `pnpm verify:baseline` verde. Al cerrar cada fase: `pnpm verify:phaseN` verde → commit → actualizar el progreso del estudiante en `docs/fases.md`.
4. Usa `pnpm verify:all` únicamente para comprobar la suite completa cuando todos los contratos estén implementados.

## Riesgos y mitigaciones

| Riesgo                              | Mitigación                                                                                   |
| ----------------------------------- | -------------------------------------------------------------------------------------------- |
| Alcance grande (7 fases)            | cada fase es mínima y cerrable; el estado queda documentado + commiteado                     |
| Tests frágiles por tiempo/aleatorio | reloj inyectable y modelo fake determinista (sin llamadas de red)                            |
| Autorizar una representación distinta de la ejecutada | preparación canónica única antes de política y ejecución                                  |
| Confundir controles técnicos con gobernanza completa | Fase 0A, responsables explícitos y mapeo de límites                                         |
| Reescritura completa del audit log  | limitación explícita + checkpoint externo en la extensión de rotación                       |
| Replay o sustitución tras aprobación | aprobación ligada al digest exacto, versión, expiración y uso único                         |
| Fricción con Ed25519/YAML           | `node:crypto` nativo y una sola dep de parseo; si YAML molesta, JSON queda como plan B       |
| Windows + scripts                   | scripts npm cross-platform (tsx/node), sin bash                                              |
| Sentirse "de juguete"               | el fake es intencional para tests; al final hay opción de adapter real y comparación con AGT |

## Referencias

- [Agent Governance Toolkit (Microsoft)](https://github.com/microsoft/agent-governance-toolkit) · comparación futura fijada a una versión o commit en el momento de realizarla
- [OWASP Top 10 for Agentic Applications 2026](https://genai.owasp.org/resource/owasp-top-10-for-agentic-applications-for-2026/) · edición 2026
- [Mapeo OWASP ASI del AGT](https://github.com/microsoft/agent-governance-toolkit/blob/main/docs/compliance/owasp-agentic-top10-architecture.md)
- [NIST AI RMF 1.0](https://doi.org/10.6028/NIST.AI.100-1) · baseline 1.0; NIST anunció que está en revisión
- [NIST AI 600-1 — Generative AI Profile](https://doi.org/10.6028/NIST.AI.600-1)
- [EU AI Act — cronología oficial](https://digital-strategy.ec.europa.eu/en/policies/regulatory-framework-ai) · consultada 2026-09-12
- [OpenAI Agents SDK (TypeScript)](https://openai.github.io/openai-agents-js/) — para comparar guardrails de framework
- [Zod](https://zod.dev) · [Vitest](https://vitest.dev) · [node:crypto](https://nodejs.org/api/crypto.html)

---

*Plan aprobado el 2026-09-12; se actualiza si una fase cambia de alcance.*
