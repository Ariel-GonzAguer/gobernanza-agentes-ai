# Conceptos — Gobernanza de Agentes de IA

Apuntes de estudio del laboratorio. Este documento crece con cada fase.

## La idea central

Gobernar un agente es ponerle controles **deterministas** (código) alrededor de sus acciones — no pedirle al modelo que se porte bien. La seguridad a nivel de prompt no es una superficie de control: es una petición amable a un sistema probabilístico.

Tres preguntas que responde una capa de gobernanza:

1. **¿Está permitida esta acción?** → policy engine, default-deny (fail-closed).
2. **¿Qué agente hizo esto?** → identidad (DID/Ed25519), capacidades, trust.
3. **¿Puedes probar qué pasó?** → auditoría tamper-evident (hash-chain).

## Las 5 capas

| Capa | Qué controla | En este proyecto |
|---|---|---|
| Política | allow / deny / require_approval antes de ejecutar | Fase 1 |
| Identidad y confianza | quién es el agente, qué puede, cuánto se confía en él | Fase 2 |
| Guardrails I/O | saneo y validación de entradas/salidas (injection, PII, args) | Fase 3 |
| Evidencia | registro tamper-evident de cada decisión | Fase 4 |
| Límites y humanos | rate limits, presupuesto, circuit breaker, aprobaciones | Fase 5 |

El orquestador de todo es el **GovernanceGate** (Fase 6): guardrails → identidad/trust → política → límites → ejecución → auditoría → guardrails de salida.

## Conceptos clave

- **Fail-closed / default-deny**: si ninguna regla permite la acción, se deniega. El default del sistema es "no".
- **Policy-as-code**: la política vive en un archivo declarativo (YAML) versionable, no en el prompt.
- **DID + Ed25519**: identidad criptográfica por agente; firma y verificación sin compartir secretos. Delegación = capacidades del hijo ⊆ capacidades del padre.
- **Trust score y tiers**: puntaje 0–1 que sube con éxitos, baja con fallos y decae con el tiempo (untrusted → provisional → trusted → verified).
- **Hash-chain de auditoría**: cada entrada incluye el hash SHA-256 de la anterior; alterar el pasado rompe `verify()`.
- **HITL (human-in-the-loop)**: las acciones irreversibles pasan por aprobación humana explícita (approve / deny / timeout).
- **Rate limit y circuit breaker**: primera línea contra cascadas y agentes desbocados; el kill switch es la última.
- **Sanitize ≠ validate**: sanitize transforma (escapa, quita caracteres de control, trunca); validate rechaza (estructura, tipos). El pipeline es `sanitize → validate → si hay injection: log → process`.
- **Logging de intentos de injection**: aunque la request no se rechace, el intento queda registrado en auditoría.

## Estándares de referencia

- **OWASP Top 10 for Agentic Applications 2026** (ASI01–ASI10): ASI01 Agent Goal Hijack · ASI02 Tool Misuse and Exploitation · ASI03 Identity and Privilege Abuse · ASI04 Agentic Supply Chain Vulnerabilities · ASI05 Unexpected Code Execution · ASI06 Memory and Context Poisoning · ASI07 Insecure Inter-Agent Communication · ASI08 Cascading Agent Failures · ASI09 Human-Agent Trust Exploitation · ASI10 Rogue Agents.
- **NIST AI RMF 1.0**: cuatro funciones — GOVERN, MAP, MEASURE, MANAGE.
- **ISO/IEC 42001**: sistema de gestión de IA (certificable).
- **EU AI Act**: reglamento por niveles de riesgo; obligaciones clave entrando en vigor durante 2026.

(El mapeo detallado control → riesgo vive en `docs/owasp-asi-mapping.md`, Fase 6.)

## Referencias

- [Agent Governance Toolkit](https://github.com/microsoft/agent-governance-toolkit) — el estado del arte que este laboratorio reconstruye por dentro
- [OWASP Top 10 Agentic 2026](https://genai.owasp.org/resource/owasp-top-10-for-agentic-applications-for-2026/)
- [NIST AI RMF](https://www.nist.gov/itl/ai-risk-management-framework)
- [OpenAI Agents SDK TS](https://openai.github.io/openai-agents-js/) — guardrails de framework, para comparar
