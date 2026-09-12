# Fase 5 — Límites y supervisión humana

**Estado**: material preparado; implementación pendiente.

## Propósito

Una política correcta puede seguir permitiendo demasiadas acciones válidas. En esta fase vas a controlar volumen, presupuesto, fallos repetidos y acciones que requieren aprobación humana.

La pregunta de esta fase es:

> ¿Cómo evitamos que una acción permitida se convierta en una cascada o en un efecto irreversible sin supervisión?

## Prerrequisitos

- Fases 1 a 4 cerradas.
- Digest canónico disponible.
- Comprensión de que `require_approval` todavía no es `allow`.

## Alcance

- Rate limit por `(agentDid, action)`.
- Presupuesto de tokens por sesión.
- Circuit breaker por tool.
- Cola de aprobaciones exactas y de un solo uso.
- Reloj inyectable para comportamiento determinista.

## Fuera de alcance

- Distribución entre múltiples procesos.
- Persistencia transaccional.
- Identidad real del operador.
- Aprobación de una tool genérica sin argumentos.
- Un kill switch operativo completo.

## Estructura esperada

```text
src/governance/limits/
├─ types.ts
├─ rate-limiter.ts
├─ token-budget.ts
├─ circuit-breaker.ts
└─ README.md

src/governance/approvals/
├─ types.ts
├─ queue.ts
└─ README.md
```

Tests preparados:

- `src/tests/future/limits.test.ts`
- `src/tests/future/approvals.test.ts`

## Rate limiter

```ts
export interface RateLimit {
  max: number;
  windowMs: number;
}

export interface RateLimitDecision {
  allowed: boolean;
  remaining: number;
  reason: string;
}

export function parseRateLimit(value: string): RateLimit;

export class RateLimiter {
  constructor(options?: { clock?: () => number });
  check(agentDid: string, action: string, limit: RateLimit): RateLimitDecision;
}
```

Formatos mínimos: `1/minute`, `10/hour`, `100/day`.

Reglas:

- Permite como máximo `N` usos dentro de la ventana.
- La clave combina agente y acción.
- Al superar `N`, rechaza la acción.
- Una nueva ventana reinicia el contador.
- El reloj se inyecta para evitar sleeps en tests.

## Presupuesto

```ts
export interface BudgetDecision {
  allowed: boolean;
  remaining: number;
  reason: string;
}

export class TokenBudget {
  constructor(limit: number);
  consume(sessionId: string, tokens: number): BudgetDecision;
  remaining(sessionId: string): number;
}
```

El módulo no calcula tokens. Recibe un consumo ya medido y rechaza cuando el total supera el límite.

## Circuit breaker

```ts
export type CircuitState = 'closed' | 'open' | 'half-open';

export class CircuitBreaker {
  constructor(options: {
    failureThreshold: number;
    resetAfterMs: number;
    clock?: () => number;
  });

  before(tool: string): { allowed: boolean; state: CircuitState; reason: string };
  record(tool: string, result: { ok: boolean }): void;
  state(tool: string): CircuitState;
}
```

El circuito abre después del número configurado de fallos, bloquea durante el intervalo y permite una prueba en `half-open`. Una prueba exitosa lo cierra.

## Aprobaciones

```ts
export interface ApprovalContext {
  agentDid: string;
  call: ToolCall;
  policyVersion: string;
}

export interface ApprovalRequest {
  id: string;
  agentDid: string;
  tool: string;
  argsDigest: string;
  policyVersion: string;
  expiresAt: number;
  used: boolean;
}

export interface ApprovalRecord {
  requestId: string;
  operator: string;
  approved: boolean;
  decidedAt: number;
}

export class ApprovalQueue {
  constructor(options?: { clock?: () => number });
  request(context: ApprovalContext, expiresAt: number): ApprovalRequest;
  decide(requestId: string, operator: string, approved: boolean): ApprovalRecord;
  consume(
    requestId: string,
    context: ApprovalContext,
  ): { ok: true; grant: ApprovalRecord } | { ok: false; reason: string };
}
```

La aprobación debe quedar ligada a:

```text
agentDid + tool + digest(args canónicos) + policyVersion + expiración + uso único
```

## Criterios de aceptación

- [ ] El límite permite hasta `N` acciones.
- [ ] La acción `N+1` se rechaza.
- [ ] Una ventana nueva reinicia el contador.
- [ ] El presupuesto rechaza al superar el total.
- [ ] El circuito abre después del umbral de fallos.
- [ ] El circuito permite una prueba después del timeout.
- [ ] Una prueba exitosa cierra el circuito.
- [ ] Una aprobación exacta permite una ejecución diferida.
- [ ] Cambiar argumentos rechaza la aprobación.
- [ ] Cambiar versión de política rechaza la aprobación.
- [ ] Reutilizar una aprobación rechaza el replay.
- [ ] Una aprobación expirada falla.
- [ ] El operador queda registrado.
- [ ] `require_approval` nunca ejecuta por sí solo.

## Pistas escalonadas

### Bloque A, tiempo

1. **Mapa**: todos los límites temporales necesitan reloj controlable.
2. **Estrategia**: inyecta una función y avanza el tiempo desde el test.
3. **Trampas**: no uses timers reales ni dependas del orden global entre tests.

### Bloque B, circuito

1. **Mapa**: el circuito protege contra fallos repetidos, no contra toda acción peligrosa.
2. **Estrategia**: separa `before` de `record`.
3. **Trampas**: no abras el circuito antes de registrar el fallo y no olvides `half-open`.

### Bloque C, aprobación

1. **Mapa**: una aprobación es una credencial contextual de un solo uso.
2. **Estrategia**: calcula un digest al crear la solicitud y compáralo al consumir.
3. **Trampas**: aprobar `email.send` sin ligar destinatario y cuerpo es un bypass.

## Auto-chequeo

1. ¿Por qué un rate limit no reemplaza a un kill switch?
2. ¿Qué diferencia hay entre una acción denegada y una pendiente?
3. ¿Por qué la aprobación debe usar argumentos canónicos?
4. ¿Qué ataque evita el uso único?
5. ¿Qué ocurre si cambia la versión de política mientras una aprobación está pendiente?

## Limitaciones honestas

- Estos contadores son locales y no resuelven concurrencia distribuida.
- El operador simulado no prueba autenticación humana real.
- Una aprobación correcta no arregla una política mal diseñada.
- Los límites reducen cascadas, pero no sustituyen una decisión de autorización.
