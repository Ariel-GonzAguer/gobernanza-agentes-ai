# Estado del laboratorio

**Siguiente paso del estudiante**: completar la Fase 0A y recorrer la implementación de referencia mediante [`START-HERE.md`](../START-HERE.md).
**Rama inicial**: `main` · **Rama de ejercicios sugerida**: `feature/governance-layer` · **Plan canónico**: [`PLAN.md`](../PLAN.md).

## Material y aprendizaje

| #   | Fase                     | Estado del material                           | Progreso del estudiante |
| --- | ------------------------ | --------------------------------------------- | ----------------------- |
| 0A  | Contexto y threat model  | listo                                         | no iniciado             |
| 0   | Agente de juguete        | código de referencia listo                    | no iniciado             |
| 1   | Policy engine            | guía y tests listos; implementación pendiente | no iniciado             |
| 2   | Identidad y confianza    | guía y tests publicados; implementación pendiente | no iniciado          |
| 3   | Guardrails I/O           | guía y tests publicados; implementación pendiente | no iniciado          |
| 4   | Auditoría                | guía y tests publicados; implementación pendiente | no iniciado          |
| 5   | Límites y HITL           | guía y tests publicados; implementación pendiente | no iniciado          |
| 6   | Integración y estándares | guía y tests publicados; implementación pendiente | no iniciado          |

El estudiante actualiza solamente la última columna cuando haya realizado el recorrido o ejercicio correspondiente. “Material listo” no equivale a aprendizaje completado.

## Bitácora del repositorio

- **2026-09-12** — Scaffold y agente de juguete generados; baseline verificada con tests, typecheck y demo.
- **2026-09-12** — Material de aceptación de la Fase 1 publicado. La suite de esa fase queda roja a propósito hasta que el estudiante la implemente.
- **2026-09-12** — Revisión previa al estudio: se añadió un recorrido inicial, una baseline independiente y una frontera de argumentos canónicos.
- **2026-09-12** — Se publicaron las guías y contratos de aceptación de las Fases 2–6; sus tests viven en `src/tests/future/` y no participan en `pnpm test` hasta activar cada fase.
- **2026-09-12** — Los comandos `test:phaseN`, `typecheck:phaseN` y `verify:phaseN` separan cada contrato; `verify` apunta a la fase activa y `verify:all` queda para el cierre completo.

## Cómo retomar

1. Mira “Siguiente paso del estudiante”.
2. Ejecuta `pnpm verify:baseline` antes de trabajar.
3. Sigue una sola fase y conserva `pnpm test:phaseN` como ciclo de feedback.
4. Al terminar: `pnpm verify:phaseN` verde, revisión de comprensión, commit y actualización de esta tabla.
