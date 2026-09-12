# Fase 0A — Contexto, responsabilidad y threat model

Antes de elegir controles, describe qué se intenta proteger. Esta ficha no busca respuestas perfectas: crea una hipótesis explícita que podrás corregir mientras aprendes.

## Resultado esperado

Una página breve que conecte propósito, riesgos, responsables y criterios de parada con las fases técnicas del laboratorio.

## Contexto inicial conocido

| Pregunta            | Respuesta inicial                                                           |
| ------------------- | --------------------------------------------------------------------------- |
| Sistema             | Agente de juguete determinista con tools simuladas.                         |
| Efectos disponibles | Buscar, leer/escribir archivos, enviar correo y consultar/vaciar una tabla. |
| Datos reales        | Ninguno; el mundo vive en memoria.                                          |
| Usuario actual      | Estudiante que ejecuta el laboratorio localmente.                           |
| Objetivo            | Aprender cómo convertir decisiones de riesgo en controles verificables.     |

## Completa antes de la Fase 1

1. **Propósito permitido**: ¿qué debería poder lograr el agente?

2. **Fuera de alcance**: ¿qué tres acciones nunca debería realizar autónomamente?

3. **Activos**: ¿qué perderías si una tool actuara mal? Piensa en confidencialidad, integridad, disponibilidad, dinero y reputación.

4. **Responsable**: ¿quién define la política y quién puede aceptar una excepción?

5. **Criterios de parada**: ¿qué eventos deberían detener o aislar al agente?

## Tres escenarios de abuso

Completa una fila por escenario.

| Acción o fallo | Impacto | Control preventivo | Evidencia o detección | Riesgo residual |
| --- | --- | --- | --- | --- |
|  |  |  |  |  |
|  |  |  |  |  |
|  |  |  |  |  |

## Criterio de cierre

- [ ] Puedes nombrar al responsable de cada decisión de riesgo.
- [ ] Cada control técnico responde a un escenario concreto.
- [ ] Identificaste al menos un riesgo que este laboratorio no resolverá.
- [ ] Entiendes que “tests verdes” no equivale a riesgo cero.

Cuando termines, cambia solamente el progreso del estudiante para la Fase 0A en [`fases.md`](./fases.md) y continúa con [`START-HERE.md`](../START-HERE.md).
