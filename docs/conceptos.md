# Conceptos — Gobernanza de agentes de IA

Apuntes vivos del laboratorio. La baseline de referencias fue revisada el 2026-09-12.

## Dos niveles que no deben confundirse

La gobernanza organizacional decide propósito, responsables, riesgos aceptables, métricas, supervisión y respuesta a incidentes. La gobernanza técnica convierte parte de esas decisiones en controles ejecutables alrededor del agente.

Este proyecto profundiza en el segundo nivel, sin presentar sus controles como un programa completo de gobernanza.

| Nivel          | Preguntas principales                                                    | Ejemplo de evidencia                                                  |
| -------------- | ------------------------------------------------------------------------ | --------------------------------------------------------------------- |
| Organizacional | ¿Para qué existe el agente? ¿Quién acepta el riesgo? ¿Cuándo se detiene? | ficha de contexto, risk register, propietario y proceso de incidentes |
| Runtime        | ¿Puede ejecutar esta acción? ¿Bajo qué límites? ¿Qué quedó registrado?   | decisión de política, aprobación ligada, audit log                    |

NIST AI RMF organiza el trabajo en GOVERN, MAP, MEASURE y MANAGE. GOVERN es transversal; el código por sí solo no satisface esas cuatro funciones.

## Frontera de ejecución

El modelo propone acciones, pero no se autoriza a sí mismo. El flujo seguro del laboratorio es:

```text
entrada cruda
  → resolver tool y validar/normalizar argumentos
  → autenticar al agente y construir contexto confiable
  → evaluar política y límites
  → obtener aprobación exacta si corresponde
  → ejecutar los mismos argumentos canónicos
  → registrar decisión y resultado
  → tratar la salida
```

La política y la tool deben observar la misma representación. Si se autoriza la entrada cruda y después Zod descarta o transforma campos, aparece una discrepancia que puede permitir bypasses o decisiones sobre datos irrelevantes.

## Capas técnicas

| Capa                  | Qué controla                                                 | En este proyecto |
| --------------------- | ------------------------------------------------------------ | ---------------- |
| Preparación           | tool conocida y argumentos canónicos                         | Fase 0           |
| Política              | allow / deny / require_approval antes de ejecutar            | Fase 1           |
| Identidad y confianza | clave que firma, capacidades y señal de confianza            | Fase 2           |
| Guardrails I/O        | separación de datos/instrucciones, límites, PII y validación | Fase 3           |
| Evidencia             | registro append-only y verificación de integridad            | Fase 4           |
| Límites y humanos     | rate limits, presupuesto, circuit breaker y aprobaciones     | Fase 5           |

El `GovernanceGate` integra las capas en la Fase 6.

## Conceptos y límites

- **Fail-closed / default-deny**: si ninguna regla permite la acción, se deniega.
- **Policy-as-code**: la política es dato declarativo, versionable y comprobable. También necesita propietario, revisión, despliegue, rollback y control de cambios.
- **Argumentos canónicos**: resultado validado y normalizado que comparten autorización y ejecución. El rol, identidad o trust no se aceptan desde `args`.
- **DID + Ed25519**: Ed25519 demuestra posesión de una clave. No demuestra identidad civil, legitimidad ni custodia segura. El DID del laboratorio es didáctico, no una DID Method interoperable.
- **Trust score**: señal contextual que puede informar una política. No concede privilegios por sí sola y puede ser manipulable si sus eventos no son confiables.
- **Hash-chain**: detecta modificaciones dentro de la cadena observada. No prueba por sí sola que un atacante no reescribió toda la cadena; para eso hace falta un ancla o checkpoint externo confiable.
- **HITL**: una aprobación debe ligarse a agente, tool, argumentos canónicos, versión de política, expiración y uso único. “Aprobar email.send” no basta.
- **Rate limit y circuit breaker**: reducen cascadas y repetición; no sustituyen un kill switch operativo.
- **Prompt controls**: las instrucciones, clasificadores y detectores heurísticos aportan defensa en profundidad. No son una frontera fiable de autorización.
- **Sanitize ≠ validate**: sanitize transforma; validate acepta o rechaza una estructura. Ninguna de las dos operaciones neutraliza por sí sola una prompt injection.

## Baseline de estándares

- **OWASP Top 10 for Agentic Applications 2026**: ASI01 Agent Goal Hijack · ASI02 Tool Misuse and Exploitation · ASI03 Identity and Privilege Abuse · ASI04 Agentic Supply Chain Vulnerabilities · ASI05 Unexpected Code Execution · ASI06 Memory and Context Poisoning · ASI07 Insecure Inter-Agent Communication · ASI08 Cascading Agent Failures · ASI09 Human-Agent Trust Exploitation · ASI10 Rogue Agents.
- **NIST AI RMF 1.0**: baseline organizacional con GOVERN, MAP, MEASURE y MANAGE. NIST informa que la versión 1.0 está en revisión.
- **NIST AI 600-1**: perfil de riesgos específico para IA generativa que complementa AI RMF 1.0.
- **ISO/IEC 42001**: sistema de gestión de IA certificable; queda como referencia, no como objetivo de conformidad del laboratorio.
- **EU AI Act**: comenzó su aplicación general y enforcement el 2 de agosto de 2026, con excepciones y plazos posteriores para determinadas obligaciones. El laboratorio no ofrece asesoría ni demostración de cumplimiento legal.

## Referencias

- [Agent Governance Toolkit](https://github.com/microsoft/agent-governance-toolkit) — inspiración técnica; la comparación futura debe fijar versión o commit
- [OWASP Top 10 for Agentic Applications 2026](https://genai.owasp.org/resource/owasp-top-10-for-agentic-applications-for-2026/)
- [NIST AI RMF 1.0](https://doi.org/10.6028/NIST.AI.100-1)
- [NIST AI 600-1 — Generative AI Profile](https://doi.org/10.6028/NIST.AI.600-1)
- [Cronología oficial del EU AI Act](https://digital-strategy.ec.europa.eu/en/policies/regulatory-framework-ai)
- [OpenAI Agents SDK TS](https://openai.github.io/openai-agents-js/) — comparación futura de guardrails de framework

El mapeo detallado de controles y vacíos vive en `docs/owasp-asi-mapping.md` cuando se complete la Fase 6.
