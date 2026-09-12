# Fase 6 — Integración, estándares y demo de incidente

**Estado**: material preparado; implementación pendiente.

## Propósito

Esta fase integra las capas construidas. El objetivo no es crear otra política, sino demostrar que cada control se ejecuta en el orden correcto y que una decisión deja evidencia suficiente.

La pregunta de esta fase es:

> ¿Cómo componemos controles independientes sin convertir el gate en una frontera confusa o bypassable?

## Prerrequisitos

- Fases 1 a 5 cerradas.
- `pnpm verify:phase5` verde.
- Comprensión de las limitaciones de cada capa.

## Alcance

- `GovernanceGate` como orquestador.
- Identidad, capacidades y revocación.
- Trust contextual.
- Política sobre call canónica.
- Rate limit, presupuesto y circuit breaker.
- Aprobación exacta.
- Tratamiento de salida.
- Auditoría de allow, deny y pending.
- Demo determinista de incidente.
- Mapeo honesto a OWASP ASI y NIST AI RMF.

## Fuera de alcance

- Conectar un LLM real.
- Demostrar cumplimiento legal.
- Resolver custodia de claves.
- Crear una plataforma multi-tenant.
- Declarar seguridad total.

## Estructura esperada

```text
src/governance/gate/
├─ types.ts
├─ governance-gate.ts
└─ README.md

src/demo/run-governance-demo.ts
src/tests/future/governance-gate.test.ts
docs/owasp-asi-mapping.md
```

## Contrato público

```ts
export interface GovernanceGateOptions {
  policy: PolicyEngine;
  identity: AgentIdentity;
  trust: TrustManager;
  guardrails: GuardrailPipeline;
  audit: AuditLogger;
  rateLimiter?: RateLimiter;
  budget?: TokenBudget;
  circuitBreaker?: CircuitBreaker;
  approvals?: ApprovalQueue;
  sessionId: string;
  policyVersion: string;
  policyHash: string;
}

export class GovernanceGate implements ToolCallGate {
  constructor(options: GovernanceGateOptions);
  evaluate(call: ToolCall): GateDecision;
  afterExecution(call: ToolCall, decision: GateDecision, result: ToolResult): ToolResult;
  pendingApprovals(): readonly ApprovalRequest[];
  approve(requestId: string, operator: string, approved: boolean): ApprovalRecord;
}
```

El hook `afterExecution` debe agregarse de forma opcional al contrato del agente para no romper el comportamiento de la Fase 1:

```ts
afterExecution?(
  call: ToolCall,
  decision: GateDecision,
  result: ToolResult,
): ToolResult | Promise<ToolResult>;
```

## Orden obligatorio

```text
call canónica
  → identidad y revocación
  → capacidad
  → trust contextual
  → política
  → rate limit y presupuesto
  → circuit breaker
  → aprobación exacta
  → ejecución
  → tratamiento de salida
  → auditoría
```

Reglas importantes:

1. Una call inválida nunca llega al gate.
2. Una identidad revocada no ejecuta.
3. Una identidad sin capacidad no ejecuta.
4. `deny` no ejecuta.
5. `require_approval` no ejecuta hasta una aprobación exacta.
6. Un límite excedido no ejecuta.
7. La auditoría registra también los bloqueos.
8. La PII se trata antes de auditar la salida.
9. La aprobación no puede reutilizarse con otra call.
10. Ningún dato de identidad viene desde `args`.

## Contexto de política

La política puede aceptar un contexto opcional separado de los argumentos:

```ts
export interface PolicyContext {
  agent: {
    did: string;
    trustScore: number;
    tier: TrustTier;
  };
}
```

Los paths de identidad deben ser `agent.did` o `agent.trustScore`, nunca `args.role` como sustituto de autenticación.

## Demo de incidente

La demo debe ejecutar un guion determinista que incluya:

1. Una búsqueda permitida.
2. Una escritura que la política no permite por default-deny.
3. Un correo externo pendiente de aprobación.
4. Un intento de `db.drop` bloqueado.
5. Una salida tratada y un audit log con cada decisión.

Debe mostrar:

- efecto de cada decisión;
- regla o control responsable;
- estado final de la tabla;
- cantidad de correos realmente enviados;
- aprobaciones pendientes;
- verificación exitosa de auditoría.

## Criterios de aceptación

- [ ] Una call inválida no llega al gate.
- [ ] Una identidad revocada no ejecuta.
- [ ] Una identidad sin capacidad no ejecuta.
- [ ] Una política `deny` no ejecuta.
- [ ] Un rate limit excedido no ejecuta.
- [ ] Un circuito abierto no ejecuta.
- [ ] Una aprobación pendiente no ejecuta.
- [ ] Una aprobación exacta permite una sola ejecución diferida.
- [ ] La salida pasa por guardrails.
- [ ] La PII no aparece en la salida tratada ni en el audit log.
- [ ] Todas las decisiones generan auditoría.
- [ ] La auditoría contiene agente, tool, digest, efecto, versión y hash de política.
- [ ] La demo bloquea la acción destructiva.
- [ ] La demo deja el correo externo pendiente.
- [ ] `pnpm verify:phase6` solo pasa con todas las capas implementadas.

## Pistas escalonadas

### Bloque A, composición

1. **Mapa**: el gate orquesta; no debe duplicar la lógica interna de cada módulo.
2. **Estrategia**: ejecuta validaciones en el orden del pipeline y devuelve la primera decisión bloqueante.
3. **Trampas**: no ejecutes para descubrir si una capa posterior habría bloqueado.

### Bloque B, aprobación diferida

1. **Mapa**: pending es un estado persistido, no un allow temporal.
2. **Estrategia**: registra solicitud, espera operador, vuelve a validar contexto y consume una sola vez.
3. **Trampas**: si cambia la call, el agente, la política o la expiración, rechaza.

### Bloque C, auditoría

1. **Mapa**: toda salida observable debe tener un evento asociado.
2. **Estrategia**: audita decisiones y resultado tratado.
3. **Trampas**: una ausencia de log también es un fallo; no registres solo éxitos.

## Auto-chequeo

1. ¿Por qué la identidad debe evaluarse antes de la política?
2. ¿Qué diferencia hay entre la call canónica y el contexto de identidad?
3. ¿Por qué `require_approval` no puede convertirse en `allow`?
4. ¿Qué evidencia queda si una tool nunca se ejecutó?
5. ¿Qué partes de este laboratorio siguen sin resolver gobernanza organizacional?

## Limitaciones honestas

- La integración no elimina riesgos de configuración o despliegue.
- La demo no representa volumen real ni concurrencia distribuida.
- El modelo sigue siendo determinista y no prueba comportamiento de un LLM real.
- El mapeo a estándares es educativo, no una certificación ni asesoría legal.
