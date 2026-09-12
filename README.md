# governace-ai-agents

Laboratorio de aprendizaje: **gobernanza de agentes de IA**, construido por fases y 100% TypeScript.

La meta es entender por dentro cómo se controla a un agente autónomo: políticas deterministas, identidad, guardrails, auditoría tamper-evident y supervisión humana — reconstruyendo el estado del arte ([Agent Governance Toolkit](https://github.com/microsoft/agent-governance-toolkit)) pieza por pieza.

- **Plan completo**: [`PLAN.md`](./PLAN.md)
- **Estado de las fases**: [`docs/fases.md`](./docs/fases.md)
- **Apuntes de conceptos**: [`docs/conceptos.md`](./docs/conceptos.md)
- **Mentor del laboratorio** (prompt portable, agnóstico al harness): [`agents/governance-mentor.md`](./agents/governance-mentor.md)

## Requisitos

- Node ≥ 20 (probado con v24)
- pnpm

## Comandos

```bash
pnpm install      # dependencias
pnpm test         # tests (Vitest)
pnpm typecheck    # TypeScript en modo strict
pnpm demo         # escenario ejecutable del agente
```

## Estructura

- `src/agent/` — el agente de juguete: modelo determinista, tools simuladas y loop de tool calls.
- `src/governance/` — la capa de gobernanza (se construye en las fases 1–6).
- `src/tests/` — tests en español, describen comportamiento (no fases).
- `docs/` — apuntes y bitácora.
