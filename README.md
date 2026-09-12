# governance-ai-agents

Laboratorio guiado para aprender **gobernanza técnica de agentes de IA** construyendo controles de ejecución en TypeScript.

El proyecto implementa un subconjunto didáctico inspirado en herramientas y estándares reales: políticas deterministas, identidad, límites, aprobaciones y auditoría. También introduce la gobernanza organizacional necesaria para decidir qué riesgos controlar y quién responde por ellos.

## Empieza acá

Sigue [`START-HERE.md`](./START-HERE.md). El primer recorrido verifica el código de referencia, explica el agente de juguete y separa claramente el material generado de tu propio progreso.

Estado actual:

- La Fase 0 contiene una implementación de referencia ya recorrida.
- La Fase 1 es la fase activa y su contrato está rojo a propósito hasta implementarla.
- Las guías y contratos de las Fases 2–6 ya están publicados, pero sus tests se activan por separado.

## Comandos

| Comando | Resultado esperado ahora |
|---|---|
| `pnpm install` | Instala las dependencias. |
| `pnpm verify:baseline` | Verde: 11 tests, typecheck del código de referencia y demo. |
| `pnpm test:phase1` | Rojo: muestra el contrato todavía pendiente. |
| `pnpm verify:phase1` | Rojo hasta terminar la fase activa; después debe quedar verde. |
| `pnpm verify` | Alias de `pnpm verify:phase1`. |
| `pnpm verify:all` | Ejecuta todos los contratos; queda rojo mientras existan fases sin implementar. |
| `pnpm test:phase2` ... `pnpm test:phase6` | Ejecutan el contrato enfocado de cada fase futura. |
| `pnpm test:watch` | Ejecuta Vitest en modo interactivo. |

Requisitos: Node.js 20 o posterior y pnpm.

## Mapa

- [`PLAN.md`](./PLAN.md) — alcance, decisiones y fases; es la copia canónica del plan.
- [`docs/fases.md`](./docs/fases.md) — estado del material y progreso del estudiante.
- [`docs/conceptos.md`](./docs/conceptos.md) — modelo mental y limitaciones de cada control.
- [`agents/governance-mentor.md`](./agents/governance-mentor.md) — contrato del mentor.
- `src/agent/` — agente determinista y tools simuladas.
- `src/governance/` — carpeta que construirás durante las fases 1–6.
- `src/tests/` — tests de referencia y de aceptación.
- `policies/` — políticas declarativas del laboratorio.

`opencode.json` registra el mentor como agente principal de OpenCode y carga directamente la fuente de verdad. `.commandcode/` ofrece una integración secundaria con Command Code.

## Alcance

El laboratorio enseña controles técnicos de runtime. No afirma reproducir todo un programa empresarial de gobernanza ni todo el Agent Governance Toolkit. Las referencias se revisaron el 2026-09-12 y están fijadas por versión o fecha en el plan para que cambios externos no alteren silenciosamente el temario.

## Licencia

El contenido original de este repositorio se distribuye bajo la licencia [MIT + Commons Clause](./LICENSE). Los materiales de terceros mencionados o incluidos mantienen sus respectivas licencias.
