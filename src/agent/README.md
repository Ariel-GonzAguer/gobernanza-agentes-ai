# `src/agent/` — el agente de juguete

El agente que la capa de gobernanza va a controlar. Es determinista y sin red: **no necesita API keys**.

## Piezas

- `types.ts` — tipos compartidos (mensajes, `Model`, `ToolDefinition`, mundo simulado).
- `model.ts` — `FakeModel`: sigue un guion de pasos (`tool_call` o `final`).
- `agent-loop.ts` — `runAgent`: pide pasos al modelo, ejecuta tool calls y arma el historial.
- `tools/` — las 6 tools de juguete sobre un mundo simulado en memoria.

## Limitaciones conocidas

- No hay capa de gobernanza todavía: cualquier tool call del modelo se ejecuta. Las fases 1+ meten el gate.
- El `FakeModel` no razona: repite el guion. Es intencional para tests deterministas.
