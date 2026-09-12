# `src/agent/tools/` — tools de juguete

Tools que actúan sobre un mundo simulado en memoria (sin efectos reales). `db.drop` es destructiva **a propósito**: será el caso de estudio para las políticas de la Fase 1.

| Tool | Qué hace |
|---|---|
| `search.web` | Devuelve resultados de ejemplo |
| `files.read` | Lee un archivo del mundo simulado |
| `files.write` | Escribe un archivo |
| `email.send` | Registra un correo (no sale a Internet) |
| `db.query` | Lee las filas de la tabla simulada |
| `db.drop` | Vacía la tabla (destructiva) |

## Cómo añadir una tool

1. Crea el archivo con su esquema Zod y su objeto `ToolDefinition`.
2. Regístrala en `registry.ts`.

La validación de argumentos vive en `runTool` (con los esquemas de cada tool): argumentos inválidos nunca llegan a ejecutarse.
