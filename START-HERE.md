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

   - `src/agent/README.md`
   - `src/agent/tools` → primero el `README.md` y luego todos los archivos de la carpeta.
   - `src/agent/types.ts`
   - `src/agent/model.ts`
   - `src/agent/tools/registry.ts`
   - `src/agent/agent-loop.ts`
   - `src/demo/run-demo.ts`

5. Responde con tus palabras:

   - ¿Qué parte propone una acción y qué parte produce el efecto?
   - ¿Qué garantiza `prepareToolCall` antes de una decisión de política?
   - ¿En qué línea conceptual debe entrar un gate para impedir `db.drop`?
   - ¿Por qué el modelo no debe declarar su propio rol dentro de `args`?

6. Cuando puedas responderlas, marca el recorrido de la Fase 0 en `docs/fases.md` y abre `docs/fase-1-policy-engine.md`.

7. Ejecuta el contrato pendiente:

   ```bash
   pnpm test:phase1
   ```

   Debe fallar porque `src/governance/policy/` todavía no existe. A partir de aquí el ciclo es rojo → implementación pequeña → verde.

## Cómo pedir ayuda en OpenCode

`opencode.json` selecciona `governance-mentor` como agente principal del proyecto. Puedes empezar con: “Ya recorrí la Fase 0 y mi respuesta a la segunda pregunta es…”. El mentor te hará avanzar con preguntas y pistas escalonadas, sin sustituir tu práctica.

## Señales de que puedes empezar la Fase 1

- [ ] `pnpm verify:baseline` termina en verde.
- [ ] Completaste la ficha de contexto y tres escenarios de abuso.
- [ ] Entiendes la diferencia entre proponer, validar, autorizar y ejecutar.
- [ ] Sabes que una política recibe argumentos canónicos, no la entrada cruda del modelo.
- [ ] Puedes localizar el único punto de ejecución de una tool.

Siguiente paso: [`docs/fase-1-policy-engine.md`](./docs/fase-1-policy-engine.md).
