# Glosario de gobernanza de agentes

Glosario de los términos necesarios para entender este laboratorio. Cada entrada conecta el concepto con el código, las políticas o los riesgos del repositorio.

## Agente y ejecución

### Agente de IA
Sistema que recibe una tarea, decide pasos y puede interactuar con herramientas. En este laboratorio es un loop determinista que consulta un `Model` y ejecuta tools sobre un `SimulatedWorld`.

### Modelo
Componente que propone el siguiente paso. En el repositorio, `Model.next()` devuelve un `ModelStep`. El modelo propone acciones, pero no debe autorizarse a sí mismo.

### `FakeModel`
Modelo determinista de prueba que devuelve pasos desde un guion predefinido. Permite probar gobernanza sin depender de una API externa ni de respuestas variables de un LLM real.

### Tool
Capacidad que el agente puede invocar para consultar o modificar un sistema. Ejemplos del laboratorio: `search.web`, `files.read`, `files.write`, `email.send`, `db.query` y `db.drop`.

### Tool call
Solicitud concreta para invocar una tool. Tiene un `id`, un `name` y `args`. Es una propuesta del modelo, no una autorización.

### `ModelStep`
Paso que devuelve el modelo. Puede ser una `tool_call` o una respuesta `final`.

### Agent loop
Bucle que pide pasos al modelo, prepara las tool calls, ejecuta las permitidas y devuelve los resultados al historial. En el repositorio está en `src/agent/agent-loop.ts`.

### Mundo simulado
Estado en memoria sobre el que actúan las tools. Está representado por `SimulatedWorld` y contiene archivos, correos y una base de datos simulada.

### Frontera de ejecución
Punto entre una propuesta y un efecto real. La gobernanza debe interceptar la call después de validarla y antes de que `prepared.execute(world)` produzca un efecto.

## Validación y argumentos

### Schema
Contrato de estructura y formato de los argumentos de una tool. Los schemas del laboratorio usan Zod. Un schema puede comprobar que existe `table`, que un string no está vacío o que un correo tiene formato válido.

### Validación
Proceso de aceptar o rechazar una estructura según un schema. Validar que un correo tiene formato correcto no significa que la política autorice enviarlo.

### Normalización
Conversión de una entrada a una representación válida y consistente. En este proyecto, `prepareToolCall` usa el resultado de Zod para construir una call canónica y no conserva campos que el schema no reconoce.

### `prepareToolCall`
Función del registro que resuelve la tool, ejecuta su schema con `safeParse` y devuelve una preparación válida o un error controlado. Es el borde entre la entrada cruda y la call canónica.

### `PreparedToolCall`
Interfaz que describe una call ya preparada. Contiene `call`, la representación canónica, y `execute`, una función que ejecuta esos mismos argumentos. La interfaz no valida ni normaliza por sí misma.

### Argumentos canónicos
Argumentos después de validación y normalización. La política y la ejecución deben observar exactamente esos mismos valores para evitar discrepancias de seguridad.

### Entrada cruda
Datos originales entregados por el modelo antes de validarlos. No deben ser autorizados directamente porque pueden contener campos inválidos, desconocidos o autodeclaraciones engañosas.

### Identidad autodeclarada
Identidad, rol o confianza incluidos por el modelo dentro de `args`. No son evidencia confiable: el solicitante podría declararse administrador. La identidad debe llegar desde un contexto autenticado separado.

## Políticas y autorización

### Política
Regla determinista que decide si una acción propuesta puede ejecutarse dadas sus condiciones. Una política autoriza o bloquea; no reemplaza al schema de la tool.

### Policy-as-code
Práctica de expresar políticas como datos o código versionable, revisable y comprobable. En este laboratorio las reglas se declaran en YAML y el motor las evalúa.

### Policy engine
Motor que carga reglas y produce una decisión para cada tool call. En la Fase 1 será `PolicyEngine`.

### Gate
Punto de control que intercepta una acción antes de ejecutarla. Devuelve un efecto y un motivo. El loop debe consultar el gate después de preparar la call y antes de ejecutar la tool.

### `allow`
Efecto que permite ejecutar la call preparada.

### `deny`
Efecto que bloquea la call de forma definitiva según la política. La tool no debe ejecutarse.

### `require_approval`
Efecto que indica que hace falta aprobación humana. En la Fase 1 todavía no existe el flujo de aprobación: la acción queda bloqueada y se informa el motivo.

### Default-deny / fail-closed
Comportamiento por el que una acción sin una regla aplicable se rechaza. Es preferible a permitir por defecto cuando un error de configuración podría producir un efecto peligroso.

### Regla de política
Entrada declarativa con identificador, patrón de tool, efecto, prioridad opcional y condiciones opcionales.

### First match wins
Semántica en la que la primera regla aplicable determina la decisión. Por eso importan el orden y la prioridad de las reglas.

### Prioridad
Valor usado para ordenar reglas antes de evaluarlas. Una prioridad mayor se evalúa primero; si hay empate, conserva el orden de declaración.

### Wildcard
Patrón que representa varias tools. En este laboratorio, `*` coincide con cualquier tool y `db.*` con nombres que empiezan por `db.`.

### Condición
Restricción que debe cumplirse para que una regla sea aplicable. El mini-lenguaje del laboratorio soporta `==`, `!=`, `in`, `and` y `or` sobre paths de `tool` y `args`.

### Path de condición
Ruta separada por puntos para encontrar un valor del contexto de la acción, por ejemplo `args.to` o `args.meta.rol`.

### Contexto de la acción
Objeto que la política evalúa, compuesto en esta fase por el nombre de la tool y sus argumentos canónicos. No debe confundirse con la identidad autenticada del solicitante.

### Contexto confiable
Información que no puede ser modificada por la propuesta del modelo, como una identidad autenticada, capacidades asignadas o una señal de confianza generada por un sistema controlado. La Fase 1 todavía no lo implementa.

### Autenticación
Proceso de comprobar quién es una entidad o qué clave controla. No responde por sí solo qué acciones puede hacer.

### Autorización
Decisión sobre si una identidad puede realizar una acción concreta bajo determinadas condiciones. Es la función principal de la política.

### Mínimo privilegio
Principio de conceder solo las capacidades necesarias para el propósito permitido. Un agente que redacta informes no necesita vaciar tablas ni leer todas las bases.

## Supervisión y controles operativos

### HITL, Human-in-the-loop
Participación humana dentro del flujo de decisión. Para una aprobación segura, esta debe ligarse a la identidad del agente, la tool, los argumentos canónicos, la versión de política, una expiración y un uso único.

### Guardrail
Control que limita entradas, acciones o salidas del agente. Los guardrails de prompt aportan defensa en profundidad, pero no deben ser la única frontera de autorización.

### Prompt injection
Entrada diseñada para manipular las instrucciones o el objetivo del modelo. Puede ser directa, desde el usuario, o indirecta, desde contenido que el agente lee.

### Tool misuse
Uso de una herramienta de forma no autorizada o fuera de su propósito. `db.drop` solicitado por el modelo es el ejemplo central de la Fase 1 y corresponde al riesgo ASI02 de OWASP.

### Exfiltración de datos
Salida no autorizada de información hacia un destino externo. En el laboratorio, leer una tabla sensible y enviarla mediante `email.send` representa este riesgo.

### Rate limit
Límite de frecuencia para reducir repeticiones o ráfagas de acciones. Puede limitar correos, consultas o llamadas en un período.

### Circuit breaker
Mecanismo que corta temporalmente una operación o un agente al detectar demasiados fallos, rechazos o actividad anómala.

### Kill switch
Mecanismo operativo para detener el agente de forma inmediata. Un rate limit o un circuit breaker no lo reemplazan.

## Evidencia y riesgo

### Auditoría
Registro de decisiones y efectos para poder reconstruir qué ocurrió, cuándo y bajo qué contexto. La auditoría persistente pertenece a una fase posterior del laboratorio.

### Audit log
Registro de eventos de autorización, bloqueo, ejecución y resultado. En la Fase 1, la evidencia mínima de un bloqueo vive en `blockedToolCalls` y en el historial del loop.

### Append-only
Registro al que se agregan eventos sin modificar los anteriores. Es una propiedad útil para auditoría, pero por sí sola no demuestra que el almacenamiento no haya sido manipulado.

### Hash chain
Cadena en la que cada evento incorpora un hash del evento anterior. Ayuda a detectar modificaciones dentro de la cadena observada, pero necesita un ancla externa confiable para proteger toda la historia.

### Threat model
Descripción explícita de activos, actores, acciones abusivas, impactos, controles, evidencia y riesgos residuales.

### Activo
Recurso que se intenta proteger. Puede ser información, integridad de datos, disponibilidad, dinero, privacidad o reputación.

### Impacto
Daño esperado si una amenaza se materializa. Ejemplos: pérdida de filas, filtración de información o envío de spam.

### Control preventivo
Medida que intenta impedir que ocurra el daño. `default-deny` para `db.drop` y aprobación humana para `email.send` son controles preventivos.

### Evidencia o detección
Señal que permite saber que ocurrió un intento o una acción. Un bloqueo registrado es evidencia, aunque no evite por sí solo un ataque posterior.

### Riesgo residual
Riesgo que permanece después de aplicar los controles. El laboratorio no elimina la ingeniería social, la manipulación de políticas ni todos los riesgos de las herramientas.

### Criterio de parada
Evento que debe detener o aislar al agente, como intentos repetidos de acciones prohibidas, modificación de políticas o volumen anómalo.

## Estándares y alcance

### OWASP Top 10 for Agentic Applications
Catálogo de riesgos específicos de aplicaciones agénticas. Este laboratorio se relaciona especialmente con ASI01, secuestro del objetivo, ASI02, abuso de tools, ASI03, abuso de identidad y privilegios, y ASI08, fallos en cascada.

### NIST AI RMF
Marco de gestión de riesgos de IA organizado en `GOVERN`, `MAP`, `MEASURE` y `MANAGE`. El código del laboratorio cubre solo una parte técnica y no constituye un programa completo de gobernanza organizacional.

### Gobernanza organizacional
Decisiones sobre propósito, responsables, riesgos aceptables, supervisión, métricas y respuesta a incidentes. La ficha de contexto ayuda a practicar este nivel.

### Gobernanza de runtime
Controles que se aplican durante la ejecución, antes y después de cada acción. Incluye políticas, identidad, guardrails, auditoría, límites y supervisión.

### Gobernanza de agentes de IA
Conjunto de decisiones organizacionales y controles técnicos que mantienen a un agente dentro de su propósito, capacidades y límites aceptables, con responsabilidad y evidencia.

### Limitación de este laboratorio
El repositorio enseña un subconjunto didáctico de gobernanza técnica. No demuestra cumplimiento legal, seguridad total, identidad interoperable, aprobación humana completa ni protección de un sistema real.

## Infraestructura de aprendizaje

### Baseline
Comportamiento de referencia que debe permanecer verde mientras se implementa una fase. Se verifica con `pnpm verify:baseline`.

### Test de aceptación
Prueba que define el comportamiento terminado de una fase. No se debe editar para ocultar un error de implementación.

### Mundo en memoria
Entorno simulado donde los efectos no salen a sistemas reales. Reduce el riesgo del laboratorio, pero no elimina la necesidad de razonar sobre los mismos controles.

### YAML
Formato declarativo usado para expresar la política del laboratorio en `policies/lab-policy.yaml`. El YAML aporta estructura de datos; el `PolicyEngine` aporta la semántica de autorización.

### Zod
Dependencia usada para validar y normalizar schemas de argumentos y documentos de política. Validar con Zod no equivale a autorizar una acción.
