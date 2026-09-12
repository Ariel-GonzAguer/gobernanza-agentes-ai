# Tu primera sesión: entender antes de implementar

Este repositorio fue generado como material de estudio. Que exista código no significa que ya hayas completado o comprendido una fase.

## Objetivo de esta sesión

En 30–45 minutos podrás explicar dónde una tool call pasa de propuesta a efecto y por qué la gobernanza debe interceptarla antes de ejecutarla.

## Recorrido rápido

1. Completa la ficha de contexto de [`docs/fase-0a-contexto.md`](./docs/fase-0a-contexto.md). Los controles de las fases siguientes deben responder a los riesgos que anotes allí.

2. Instala y verifica la referencia:

   ```bash
   pnpm install
   pnpm verify:baseline
   ```

   Debes ver 11 tests verdes, typecheck verde y una demo que escribe un archivo y registra un correo en memoria.

3. Ejecuta solamente la demo:

   ```bash
   pnpm demo
   ```

   Observa que `files.write` y `email.send` se ejecutan sin pedir permiso. Ese es el problema que gobernará la Fase 1.

4. Lee, en este orden:

   - `src/agent/types.ts`
   - `src/agent/model.ts`
   - `src/agent/tools/registry.ts`
   - `src/agent/agent-loop.ts`
   - `src/demo/run-demo.ts`

5. Responde con tus palabras:

   - ¿Qué parte propone una acción y qué parte produce el efecto? → la acción es propuesta por el Modelo, usando el método next() con ModelStep. Y es ejecutada en agent-loop usando runTool. 
   - ¿Qué garantiza `prepareToolCall` antes de una decisión de política? → que la tool exista y que los argumentos son válidos.
   - ¿En qué línea conceptual debe entrar un gate para impedir `db.drop`? →  después de prepareToolCall y antes de prepared.execute(...). El registro prepara, el gate decide, la tool ejecuta.
   - ¿Por qué el modelo no debe declarar su propio rol dentro de `args`? → Porque podría hacerse pasar por el user/humano y aplicar excepciones a las políticas.

6. Cuando puedas responderlas, marca el recorrido de la Fase 0 en `docs/fases.md` y abre `docs/fase-1-policy-engine.md`.

7. Ejecuta el contrato pendiente:

   ```bash
   pnpm test:phase1
   ```

   Debe fallar porque `src/governance/policy/` todavía no existe. A partir de aquí el ciclo es rojo → implementación pequeña → verde.

## Cómo pedir ayuda en OpenCode

`opencode.json` selecciona `governance-mentor` como agente principal del proyecto. Puedes empezar con: “Ya recorrí la Fase 0 y mi respuesta a la segunda pregunta es…”. El mentor te hará avanzar con preguntas y pistas escalonadas, sin sustituir tu práctica.


- Proponer: lo hace el modelo. Se refiere a qué tool y argumentos usar.
- Validar: se hace con el schema y una función prepareToolCall. Verifica que la llamada a la tool sea válida. No ejecuta nada.
- Autorizar: se defina con la politica y contexto. Define si una tool se ejecuta o no, aunque sea válida.
- Ejecutar: lo hace el runtime, invocando prepared.execute(world), y la tool produce el efecto.

*El modelo solo propone. **Nunca** debe tener autoridad para ejecutar directamente.*

## Señales de que puedes empezar la Fase 1

- [x] `pnpm verify:baseline` termina en verde.
- [x] Completaste la ficha de contexto y tres escenarios de abuso.
- [x] Entiendes la diferencia entre proponer, validar, autorizar y ejecutar.
- [x] Sabes que una política recibe argumentos canónicos, no la entrada cruda del modelo.
- [x] Puedes localizar el único punto de ejecución de una tool.

Siguiente paso: [`docs/fase-1-policy-engine.md`](./docs/fase-1-policy-engine.md).
