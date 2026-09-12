# Fase 1 — Policy engine: ¿está permitida esta acción?

**Estado**: material publicado el 2026-09-12.
**Modelo de trabajo**: tú implementas; el mentor explica, revisa y da pistas — no escribe `src/governance/` ni los tests.
**Criterio de cierre**: `pnpm verify` verde + demo con `db.drop` denegado y un `email.send` en revisión.

Antes de empezar, completa el recorrido de [`START-HERE.md`](../START-HERE.md) y confirma que `pnpm verify:baseline` está verde.

## Por qué esta fase

La primera pregunta de cualquier capa de gobernanza es la más vieja de la seguridad: **¿está permitida esta acción?** Y se responde *antes* de ejecutar, con código determinista — no pidiéndole al modelo que se porte bien.

Vas a construir un motor de políticas **policy-as-code**: reglas declarativas en YAML que se evalúan contra cada tool call, con dos garantías que son el corazón del control:

- **default-deny (fail-closed)**: si ninguna regla permite la acción, se deniega. El default del sistema es "no".
- **efectos explícitos**: `allow`, `deny` y `require_approval` (la aprobación humana se conecta en la Fase 5; aquí la acción queda bloqueada y registrada).

Esto ataca directamente el riesgo **ASI02 — Tool Misuse** del OWASP Agentic Top 10: el agente puede *pedir* lo que quiera; el motor decide si eso se *ejecuta*.

## Paso 0 — Tour del agente de juguete (antes de tocar nada)

La Fase 0 quedó conservada como referencia resuelta y no la escribiste tú. Antes de implementar, lee estos archivos con las preguntas de abajo en mano:

| Archivo | Qué mirar |
|---|---|
| `src/agent/types.ts` | `ToolCall`, `ModelStep`, `ToolResult`, `AgentRunResult`: el vocabulario del loop |
| `src/agent/agent-loop.ts` | dónde se pide el siguiente paso, dónde se ejecuta una call y qué se le devuelve al modelo |
| `src/agent/tools/registry.ts` | `prepareToolCall`: resolución y normalización; `prepared.execute`: único efecto |
| `src/agent/tools/db.ts` y `src/agent/tools/email.ts` | dos tools con efectos reales: una destructiva, una externa |

Preguntas para responder en el chat antes de escribir código:

1. ¿En qué punto exacto del loop se ejecuta una tool call? ¿Dónde interceptarías después de prepararla pero **antes** de su ejecución?
2. Si el gate bloquea una acción, ¿el loop debería cortarse o seguir? ¿Qué necesita saber el modelo para reaccionar?
3. Todavía no hay auditoría (Fase 4): ¿qué evidencia mínima del bloqueo puedes dejar ya en el resultado del loop?
4. ¿Por qué una política debe evaluar `prepared.call` y no la call cruda del modelo?

## Conceptos y referencias

- Tu resumen vive en `docs/conceptos.md` (capa *Política*, fail-closed, ASI02).
- **Agent Governance Toolkit**: [repo](https://github.com/microsoft/agent-governance-toolkit) · [docs](https://microsoft.github.io/agent-governance-toolkit/) — mira cómo modela políticas y efectos; su formato real es YAML/Rego/Cedar.
- **OPA/Rego** y **Cedar (AWS)**: los lenguajes de política del ecosistema industrial; sus "effects" y reglas por defecto te dan el contexto de lo que aquí se simplifica.
- Glosario mínimo: *policy-as-code* · *fail-closed / default-deny* · *first-match* · *prioridad* · *wildcard* · *condición sobre el contexto de la acción*.

## Flujo objetivo

```
modelo propone tool call
        │
        ▼
prepareToolCall ── inválida ──► error controlado; no hay efecto
        │
        ▼ call canónica
  gate (PolicyEngine)
        │
        ├── deny / require_approval ──► NO se ejecuta
        │                               se registra como bloqueada
        │                               el modelo recibe el motivo
        │
        └── allow ──► prepared.execute ──► mundo simulado
```

## Especificación

Los tests de aceptación fijan el contrato de abajo **al nivel de imports, tipos y comportamiento**. Nombres internos de helpers y estructura fina de archivos son tuyos, siempre que respetes lo que los tests importan.

### 1) El hook en el loop (`src/agent/`)

Añade a `src/agent/types.ts` (con su JSDoc en español, como el resto del archivo):

```ts
/** Efecto que un gate puede devolver antes de ejecutar una tool call. */
export type GateEffect = 'allow' | 'deny' | 'require_approval';

/** Decisión de un gate sobre una tool call ya validada y normalizada. */
export interface GateDecision {
  effect: GateEffect;
  reason: string;
}

/** Punto de decisión consultado por el loop antes de ejecutar cada tool call. */
export interface ToolCallGate {
  /**
   * Decide si una tool call canónica puede ejecutarse.
   * @param call - Tool call validada y normalizada por `prepareToolCall`.
   * @returns Decisión con el efecto y el motivo legible.
   */
  evaluate(call: ToolCall): GateDecision | Promise<GateDecision>;
}

/** Tool call que un gate no dejó ejecutar. */
export interface BlockedToolCall {
  call: ToolCall;
  decision: GateDecision;
}
```

Y estos cambios de contrato:

- `AgentLoopOptions` gana `gate?: ToolCallGate` — si se omite, todo se ejecuta como hasta ahora.
- `AgentRunResult` gana `blockedToolCalls: BlockedToolCall[]` — **siempre** un arreglo (vacío si no hay gate o no bloqueó nada).

Comportamiento del loop (esto es lo que verifican los tests):

1. Llama a `prepareToolCall(step.call)` antes del gate. Si falla, comunica el error al modelo y no consulta la política ni ejecuta la tool.
2. Si la preparación funciona, pasa solamente `preparation.prepared.call` al gate. Nunca autorices la entrada cruda del modelo.
3. Si no hay gate o `decision.effect === 'allow'` → llama a `preparation.prepared.execute(options.world)` y registra el resultado.
4. Si no → **no llames a `execute`**; agrega la call canónica y su decisión a `blockedToolCalls`, y añade al historial un mensaje `tool` con:
   - `deny` → `JSON.stringify({ ok: false, error: 'Acción denegada por política: <reason>' })`
   - `require_approval` → `JSON.stringify({ ok: false, error: 'Acción pendiente de aprobación humana: <reason>' })`
5. El loop **continúa**: el modelo recibe ese mensaje y decide el siguiente paso. Una acción bloqueada no es un error fatal, es información.

La preparación evita una discrepancia de seguridad: la política y la tool deben observar exactamente los mismos valores. Un campo descartado por Zod —por ejemplo, un rol autodeclarado que la tool ni siquiera reconoce— no puede conceder autorización.

### 2) El módulo de políticas (`src/governance/policy/`)

Estructura sugerida (tests solo importan `engine.ts` y `types.ts`):

```
src/governance/policy/
├─ types.ts       # tipos del dominio de políticas
├─ engine.ts      # parsePolicyYaml + PolicyEngine
├─ conditions.ts  # matching de tools y evaluación de condiciones (sugerido)
└─ README.md      # qué es esta carpeta y cómo se usa (convención del proyecto)
```

`src/governance/policy/types.ts`:

```ts
import type { GateEffect, ToolCall } from '../../agent/types';

/** Efecto que una regla de política asigna a una acción. */
export type PolicyEffect = GateEffect;

/** Valores admitidos en las comparaciones de condiciones. */
export type PolicyLiteral = string | number | boolean | null;

/** Condición del mini-lenguaje de políticas. */
export type PolicyCondition =
  | { op: '=='; path: string; value: PolicyLiteral }
  | { op: '!='; path: string; value: PolicyLiteral }
  | { op: 'in'; path: string; values: PolicyLiteral[] }
  | { op: 'and'; conditions: PolicyCondition[] }
  | { op: 'or'; conditions: PolicyCondition[] };

/** Regla que decide sobre un patrón de tool calls. */
export interface PolicyRule {
  id: string;
  description?: string;
  tool: string;
  effect: PolicyEffect;
  priority?: number;
  conditions?: PolicyCondition[];
}

/** Documento de política tal como se declara en YAML. */
export interface PolicyDocument {
  version: 1;
  rules: PolicyRule[];
}

/** Decisión del motor para una tool call concreta. */
export interface PolicyDecision {
  effect: PolicyEffect;
  ruleId: string | null;
  reason: string;
}
```

`src/governance/policy/engine.ts` (firmas; los cuerpos son tuyos):

```ts
/** Carga un documento de política desde YAML y lo valida con Zod. */
export function parsePolicyYaml(source: string): PolicyDocument;

/** Motor de evaluación: reglas declaradas → decisión para cada tool call. */
export class PolicyEngine {
  constructor(rules: PolicyRule[]);
  /** Construye un motor desde el texto YAML de una política. */
  static fromYaml(source: string): PolicyEngine;
  /**
   * Evalúa una tool call contra las reglas.
   * @param call - Tool call propuesta por el modelo.
   * @returns La decisión: efecto, regla responsable (o null) y motivo legible.
   */
  evaluate(call: ToolCall): PolicyDecision;
}
```

`PolicyEngine` debe satisfacer el contrato `ToolCallGate` de forma **estructural** (sin heredar ni acoplar `agent` → `governance`): por eso `PolicyDecision` reutiliza `GateEffect`.

### 3) Semántica de evaluación (el contrato que verifican los tests)

1. Las reglas se ordenan por `priority` **descendente**; `priority` ausente vale `0`.
2. Empate de prioridad → decide el **orden de declaración** (sort estable, sin mutar el arreglo del llamador).
3. **First match wins**: la primera regla cuyo patrón de tool coincide **y** cuyas condiciones se cumplen decide. No se evalúa nada más.
4. Patrones de tool: `'*'` alcanza a todo; `'db.*'` alcanza a los nombres que empiezan con `db.`; cualquier otro valor es coincidencia exacta.
5. Condiciones sobre el contexto `{ tool: call.name, args: call.args }` con paths separados por puntos (`args.to`, `args.meta.rol`):
   - `==` / `!=`: igualdad estricta contra el literal (`1 !== '1'`).
   - `in`: el valor del path debe ser estrictamente igual a alguno de `values`.
   - `and`: se cumplen todas; `or`: se cumple al menos una. La recursión es libre.
   - **Path inexistente ⇒ la condición es `false`**, incluso con `!=` (fail-closed).
   - `and` / `or` sin hijos ⇒ `false` (no "verdad vacua").
   - Regla sin `conditions` ⇒ las condiciones se consideran cumplidas.
6. Si ninguna regla decide:

```ts
{ effect: 'deny', ruleId: null, reason: 'Sin regla aplicable: se deniega por defecto (fail-closed).' }
```

7. `reason` de una regla que decide: un texto legible que incluya su `id` (los tests solo exigen que no esté vacío y, en default-deny, que mencione "sin regla").

### 4) Formato YAML

```yaml
version: 1
rules:
  - id: permitir-lectura        # requerido, no vacío
    description: Texto libre    # opcional
    tool: files.read            # requerido, patrón
    effect: allow               # allow | deny | require_approval
    priority: 50                # opcional, default 0
    conditions:                 # opcional
      - op: '=='
        path: args.to
        value: equipo@example.com
```

La política real del laboratorio ya está en **`policies/lab-policy.yaml`** (léela: ahí están los cinco casos de la demo). Los errores de carga deben ser claros y distinguibles:

- YAML con sintaxis rota → menciona `YAML` en el mensaje.
- Documento válido como YAML pero inválido como política (falta `version`, `effect` desconocido, `id` vacío…) → menciona `política inválida` e idealmente el path del problema.

### 5) Demo

Crea `src/demo/run-policy-demo.ts` y agrega el script:

```json
"demo:policy": "tsx src/demo/run-policy-demo.ts"
```

La demo debe: leer `policies/lab-policy.yaml`, construir el motor, correr el agente con un `FakeModel` cuyo guion pase por `search.web`, `files.write`, `email.send` a un externo y `db.drop`, e imprimir por cada tool call el efecto y la regla que decidió, más el estado final del mundo (tabla intacta, cero correos). Salida esperada:

- `search.web` → allow (`buscar-en-web`)
- `files.write` → deny por **default-deny** (no hay regla que lo permita)
- `email.send` externo → require_approval (`correo-externo-revisado`)
- `db.drop` → deny (`prohibido-vaciar-tablas`)

## Tests de aceptación

Están en `src/tests/policy.test.ts` y `src/tests/agent-gate.test.ts`. Describen comportamiento, no orden de implementación, y **no se editan para que pasen**: si un test contradice el spec, se discute y decide el humano.

Hoy la suite está **roja a propósito** (los imports no existen todavía): es el contrato de la fase, no una emergencia. Tu trabajo es ponerla verde sin tocarla.

```bash
pnpm verify:baseline  # debe seguir verde durante todo el ejercicio
pnpm test:phase1      # contrato rojo → verde de esta fase
pnpm verify           # cierre: suite completa + typecheck
```

## Pistas escalonadas

Pide la pista **por bloque** cuando ya lo intentaste; el mentor sube de nivel solo si hace falta.

### Bloque A — tipos del gate

1. *Mapa*: el loop necesita un punto de decisión; ese contrato pertenece al vocabulario del agente.
2. *Estrategia*: define el efecto (tres valores), la decisión (efecto + motivo) y una interfaz con un solo método `evaluate`.
3. *Trampas*: `exactOptionalPropertyTypes` no te deja asignar `undefined` explícito a una propiedad opcional; y no hagas que `agent` importe tipos de `governance` para evitar el ciclo conceptual — el motor se acopla por estructura.
4. *Pseudocódigo*: no aplica: es declaración de tipos y firmas.

### Bloque B — motor y prioridades

1. *Mapa*: ordenar una vez, decidir por primer match, y un fallback que niega.
2. *Estrategia*: en el constructor copia y ordena; una función `matchesTool(patrón, nombre)`; un bucle que devuelve la primera regla que coincide; si el bucle termina, decisión default-deny.
3. *Trampas*: no mutes el arreglo original; confía en el sort estable para los empates; `priority` ausente = 0.
4. *Pseudocódigo*: copiar reglas → ordenar por prioridad descendente → para cada regla: ¿coincide el patrón? ¿cumple condiciones? si sí, devolver decisión con su id y motivo → si ninguna, devolver deny con ruleId null y motivo "sin regla…".

### Bloque C — condiciones

1. *Mapa*: un mini-intérprete de expresiones sobre `{ tool, args }`.
2. *Estrategia*: una función que resuelve el path (recorriendo objetos, sin lanzar) y un switch por operador; `and`/`or` delegan recursivamente.
3. *Trampas*: valor ausente o intermedio no-objeto ⇒ `false` (incluso `!=`); `and`/`or` vacíos ⇒ `false`; comparación estricta.
4. *Pseudocódigo*: resolver path → si el valor es "no existe", devolver false → si es `and`, exigir todas; si es `or`, al menos una; si es comparación, comparar estricto (o buscar dentro de `values`).

### Bloque D — YAML + Zod

1. *Mapa*: la política es **dato versionable**, no código; se valida en el borde.
2. *Estrategia*: un esquema pequeño por nivel (literal, condición recursiva, regla, documento) y traducir los problemas a un mensaje con el path; envuelve aparte el error de sintaxis del parser YAML.
3. *Trampas*: una condición puede contener condiciones → unión recursiva (Zod necesita evaluación perezosa); en YAML, `'=='` y `'!='` van entre comillas (sin comillas, `!=` parece un tag y el parser falla); no confundas error de sintaxis con error de forma.
4. *Pseudocódigo*: parsear YAML en try/catch (error de sintaxis → mensaje "YAML inválido") → validar con Zod (problema → mensaje "política inválida: path y detalle") → devolver documento tipado.

### Bloque E — hook en el loop

1. *Mapa*: la intercepción queda entre `prepareToolCall` y `prepared.execute`; `blockedToolCalls` es la evidencia mínima del bloqueo.
2. *Estrategia*: preparar → manejar error o consultar el gate con la call canónica → ramificar por efecto → ejecutar o bloquear → dejar que el loop siga.
3. *Trampas*: no evalúes `step.call` directamente; no vuelvas a parsear antes de ejecutar; no ejecutes una tool bloqueada “para ver si funcionaba”; `blockedToolCalls` siempre es un arreglo.
4. *Pseudocódigo*: preparar la call → si es inválida, comunicar error → obtener decisión sobre la call canónica → si permite, ejecutar la preparación → si no, registrar el bloqueo → continuar.

## Trampas conocidas

- `verbatimModuleSyntax: true`: todo lo que sea un tipo se importa con `import type` (si no, TypeScript lo rechaza).
- Dependencias: usa `yaml` y `zod`, ya instaladas; no agregues nada nuevo sin pedirlo.
- Comparaciones estrictas: `value: 1` no coincide con `'1'`; el YAML puede devolver números donde esperas strings.
- `Array.prototype.sort` es estable, pero ordena in-place: ordena una copia.
- Las propiedades de identidad, rol o confianza no vienen de `args`; la Fase 2 las añadirá desde un contexto autenticado.
- Al resolver paths usa solo propiedades propias del objeto (`Object.hasOwn`), nunca valores heredados del prototipo.
- No confundas "no ejecutada" con "ejecutada que falló": son arreglos distintos en el resultado.
- La política de ejemplo también es un test: si la editas, revisa que siga cumpliendo su contrato.

## Cierre de la fase

1. `pnpm verify` verde (sin tocar los tests de aceptación).
2. `pnpm demo:policy` mostrando los cuatro efectos esperados.
3. Pídeme la revisión: repasamos código y auto-chequeo antes de cerrar.
4. Con el visto bueno: `git commit` (uno por fase, conventional commit en español y detallado) y actualizamos `docs/fases.md`.

## Auto-chequeo

Antes de cantar victoria, respóndete (se comentan en la revisión):

1. ¿Por qué "sin regla" debe denegar y no permitir? ¿Qué clase de fallo previene?
2. ¿Qué pasaría si `require_approval` se tratara como `allow` hasta que exista la Fase 5?
3. ¿Por qué un path inexistente evalúa `false` incluso con `!=`? ¿Qué ataque o descuido cierras?
4. ¿Por qué el loop debe seguir tras un bloqueo en vez de terminar?
5. ¿Qué diferencia práctica hay entre `deny` y `require_approval` para el modelo y para la operación?
6. ¿Qué **no** puedes garantizar todavía sin identidad (Fase 2) ni auditoría (Fase 4)?
7. ¿Qué vulnerabilidad aparece si autorizas la call cruda pero ejecutas argumentos transformados por Zod?

## Limitaciones honestas de esta fase

- La aprobación humana todavía no existe: `require_approval` solo bloquea y avisa (se conecta en la Fase 5).
- No hay registro persistente ni tamper-evident: la evidencia vive en el resultado del loop (Fase 4).
- El motor decide sobre *nombres y argumentos*; todavía no sabe *quién* pide la acción (Fase 2).
- Los argumentos son canónicos, pero siguen siendo datos del solicitante; nunca sustituyen una identidad autenticada.
- El mini-lenguaje de condiciones es a propósito diminuto: sin aritmética, sin regex, sin referencias a otros recursos.
