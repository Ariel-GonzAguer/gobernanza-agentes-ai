# Mapeo educativo a riesgos OWASP ASI y NIST

Este documento conecta los controles del laboratorio con riesgos conocidos. No afirma cobertura completa ni cumplimiento.

| Control del laboratorio | Riesgo relacionado | Evidencia esperada | Límite |
|---|---|---|---|
| Política sobre call canónica | ASI02, abuso de tools | decisión `allow`, `deny` o `require_approval` | no conoce toda la identidad hasta la Fase 2 |
| Identidad y capacidades | ASI03, abuso de identidad y privilegios | firma, DID didáctico, capacidad y revocación | Ed25519 no prueba identidad civil |
| Guardrails de entrada/salida | ASI01 y ASI06 | findings, límites y PII tratada | heurísticas no neutralizan toda injection |
| Auditoría hash-chain | ASI08 y trazabilidad operativa | cadena verificable | requiere ancla externa para reescritura completa |
| Rate limit y circuit breaker | ASI08, fallos en cascada | decisión de límite o estado del circuito | no reemplaza kill switch |
| HITL exacto | ASI09, explotación de confianza humano-agente | aprobación ligada a digest y expiración | operador simulado |
| Capacidad mínima | ASI03 y ASI10 | acción fuera de capacidad bloqueada | requiere configuración correcta |

## Relación con NIST AI RMF

| Función | Qué se practica |
|---|---|
| GOVERN | propósito, responsables, límites y criterios de parada en Fase 0A |
| MAP | threat model, activos, escenarios y contexto de las fases |
| MEASURE | tests deterministas, auditoría, verificación de cadena y métricas de límites |
| MANAGE | bloqueo, aprobación, circuit breaker, respuesta y demo de incidente |

## Vacíos que permanecen

- Gestión organizacional de proveedores y cambios.
- Evaluación de impacto en producción.
- Monitoreo operacional real.
- Custodia y rotación de claves.
- Seguridad del entorno donde corre el runtime.
- Revisión humana de la calidad del propósito y de los datos.
