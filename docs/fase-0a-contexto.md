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

1. **Propósito permitido**: ¿qué debería poder lograr el agente? → creo que un agente que funcione como asistente de oficina, debería poder leer (¿algunas?) bases de datos para poder escribir informes, por lo que también debería poder enviar los informes, con revision y permiso del humano. 

2. **Fuera de alcance**: ¿qué tres acciones nunca debería realizar autónomamente? → 
- vaciar/eliminar una ddbb/tabla bajo cualquier condición.
- enviar correos sin revisión humana.
- tener acceso a todas las tablas (puede después enviar por correo info a un atacante)

3. **Activos**: ¿qué perderías si una tool actuara mal? Piensa en confidencialidad, integridad, disponibilidad, dinero y reputación.
- Integridad: Pérdida total o parcial de datos críticos del negocio si se ejecuta un borrado no autorizado.
- Confidencialidad: Exfiltración de datos sensibles si el agente lee información restringida y la envía al exterior por correo.
- Reputación y Dinero: Envío de spam o correos ofensivos a clientes en nombre de la empresa, lo que arruinaría la confianza en nuestra marca.

4. **Responsable**: ¿quién define la política y quién puede aceptar una excepción?
- Responsable: Administrador de TI o el equipo de seguridad de la empresa (en este lab, Yo).
- Excepción: Humano supervisor en tiempo real.

5. **Criterios de parada**: ¿qué eventos deberían detener o aislar al agente?
- Intenta ejecutar una acción prohibida por política más de 3 veces consecutivas.
- Intenta modificar o saltarse su propio archivo de políticas.
- Hay una anomalía de volumen (ej. intenta enviar decenas de correos en un minuto).

## Tres escenarios de abuso

Completa una fila por escenario.

| Acción o fallo                           | Impacto                                           | Control preventivo                                                                                                     | Evidencia o detección                                                      | Riesgo residual                                                                                 |
| ---------------------------------------- | ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `db.drop` solicitado por el modelo       | pérdida de datos                                  | default-deny                                                                                                           | decisión denegada en auditoría                                             | cambio malicioso de la política                                                                 |
| Exfiltración de datos sensibles vía Mail | Violación de confidencialidad de datos.           | Bloqueo del envío de correos autónomo; toda llamada a email.send requiere confirmación de un supervisor humano (HITL). | Alerta de autorización pendiente enviada al canal del supervisor.          | Ingeniería social al supervisor humano para que autorice el envío creyendo que es inofensivo.   |
| Acceso no autorizado a tablas sensibles  | Acceso ilícito y posible escalada de privilegios. | CFiltro en la política de consultas de base de datos (db.query) que prohíba nombres de tablas restringidas.            | Error de violación de política devuelto al agente y logueado en auditoría. | Inyección de código SQL indirecta si la herramienta de base de datos no sanitiza los argumentos |

## Criterio de cierre

- [x] Puedes nombrar al responsable de cada decisión de riesgo.
- [x] Cada control técnico responde a un escenario concreto.
- [x] Identificaste al menos un riesgo que este laboratorio no resolverá.
- [x] Entiendes que “tests verdes” no equivale a riesgo cero.

Cuando termines, cambia solamente el progreso del estudiante para la Fase 0A en [`fases.md`](./fases.md) y continúa con [`START-HERE.md`](../START-HERE.md).
