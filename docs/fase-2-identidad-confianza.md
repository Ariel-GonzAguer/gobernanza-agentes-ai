# Fase 2 — Identidad y confianza

**Estado**: material preparado; implementación pendiente.

## Propósito

La Fase 1 decide si una call canónica está permitida, pero todavía no sabe quién la solicita. En esta fase vas a añadir una identidad verificable para el agente y una señal de confianza contextual.

La pregunta de esta fase es:

> ¿Qué agente solicita la acción y qué evidencia tenemos sobre su estado?

La identidad aporta autenticidad criptográfica. La confianza aporta contexto. Ninguna de las dos debe convertirse automáticamente en permiso.

## Prerrequisitos

- Fase 1 cerrada con `pnpm verify:phase1` verde.
- Comprensión de `ToolCall`, argumentos canónicos y política.
- Sin dependencias nuevas: usa `node:crypto` y utilidades propias.

## Alcance

### Incluido

- Identidad Ed25519 en memoria.
- DID didáctico con prefijo `did:lab:`.
- Firma y verificación de payloads.
- Capacidades con coincidencia exacta y comodines.
- Delegación sin ampliación de privilegios.
- Revocación de identidad y de la cadena de delegación.
- Trust score determinista con tiers y decay.

### Fuera de alcance

- Registro global de identidades.
- Custodia segura de claves privadas.
- DID Method interoperable.
- Confianza como sustituto de autorización.
- Persistencia o rotación de claves.

## Estructura esperada

```text
src/governance/identity/
├─ types.ts
├─ identity.ts
└─ README.md

src/governance/trust/
├─ types.ts
├─ manager.ts
└─ README.md
```

Los tests preparados están en `src/tests/future/identity.test.ts` y `src/tests/future/trust.test.ts`. Se mantienen fuera de la suite por defecto hasta que esta fase se abra.

## Contrato de identidad

### Tipos públicos

```ts
export interface IdentityRecord {
  id: string;
  did: string;
  publicKey: string;
  capabilities: string[];
  parentDid: string | null;
  delegationDepth: number;
  revoked: boolean;
}

export interface SignedPayload {
  did: string;
  payload: string;
  signature: string;
}
```

### `AgentIdentity`

Debe exponer una clase con estas operaciones:

```ts
static generate(
  id: string,
  capabilities: string[],
  options?: { maxDelegationDepth?: number },
): AgentIdentity;

get record(): IdentityRecord;

sign(payload: string): SignedPayload;
verify(proof: SignedPayload): boolean;
delegate(id: string, capabilities: string[]): AgentIdentity;
revoke(): void;
can(action: string): boolean;
```

### Reglas de identidad

1. La clave se genera con Ed25519 nativo.
2. `IdentityRecord` nunca expone la clave privada.
3. El DID tiene la forma `did:lab:<id>:<fingerprint>`.
4. Modificar el payload invalida la firma.
5. Modificar la firma invalida la verificación.
6. Una identidad revocada no puede autorizar capacidades.
7. `can` acepta capacidades exactas, prefijos como `db.*` y `*`.
8. Una delegación solo puede conservar o reducir capacidades del padre.
9. La delegación no puede superar `maxDelegationDepth`.
10. Revocar al padre invalida también la cadena descendiente.

## Contrato de confianza

```ts
export type TrustTier = 'low' | 'medium' | 'high';

export interface TrustSnapshot {
  agentDid: string;
  score: number;
  tier: TrustTier;
  updatedAt: number;
}

export class TrustManager {
  constructor(options?: {
    clock?: () => number;
    initialScore?: number;
    decayPerHour?: number;
  });

  observe(agentDid: string, delta: number): TrustSnapshot;
  get(agentDid: string): TrustSnapshot;
}
```

Valores esperados:

- Score limitado entre `0` y `100`.
- Score inicial `50`.
- `low` para menos de `40`.
- `medium` desde `40` hasta menos de `70`.
- `high` desde `70`.
- El decay acerca el score gradualmente a `50`.
- El reloj debe poder inyectarse para tests deterministas.

## Flujo conceptual

```text
payload
  → AgentIdentity.sign
  → proof
  → AgentIdentity.verify
  → identidad revocada/capacidades
  → política
```

El trust score puede informar una política futura, pero no debe abrir una capacidad que la identidad no posee.

## Criterios de aceptación

- [ ] Una firma válida verifica correctamente.
- [ ] Un payload modificado falla.
- [ ] Una firma modificada falla.
- [ ] El DID tiene el formato esperado.
- [ ] La clave privada no aparece en el registro público.
- [ ] Una delegación con capacidades reducidas funciona.
- [ ] Una delegación con capacidades nuevas falla.
- [ ] La profundidad máxima se respeta.
- [ ] La revocación bloquea la identidad.
- [ ] Revocar al padre invalida al hijo.
- [ ] El score queda acotado.
- [ ] El decay funciona con reloj falso.
- [ ] El trust por sí solo no permite una tool.

## Pistas escalonadas

### Bloque A, claves y firma

1. **Mapa**: `node:crypto` contiene la frontera criptográfica.
2. **Estrategia**: genera un par Ed25519, conserva la privada dentro de la instancia y exporta solo la pública.
3. **Trampas**: el payload debe ser exactamente el mismo al firmar y verificar; no serialices objetos de forma ambigua.
4. **Pseudocódigo**: generar claves → exportar pública → firmar texto → devolver prueba → verificar con la pública.

### Bloque B, capacidades

1. **Mapa**: `can` resuelve si una acción pertenece al conjunto de capacidades.
2. **Estrategia**: prueba primero coincidencia exacta, luego prefijo y finalmente wildcard global.
3. **Trampas**: `db.*` no debe autorizar `files.read`; una identidad revocada siempre falla.

### Bloque C, delegación

1. **Mapa**: el hijo nunca puede tener una capacidad fuera del conjunto del padre.
2. **Estrategia**: valida cada capacidad solicitada contra el padre antes de crear el hijo.
3. **Trampas**: la delegación no es una copia libre de capacidades; controla también la profundidad.

### Bloque D, trust

1. **Mapa**: el score es estado contextual, no autorización.
2. **Estrategia**: conserva snapshots por DID y aplica decay solo cuando se consulta u observa.
3. **Trampas**: limita el score y usa reloj inyectable; no uses `Date.now()` directamente en los tests.

## Auto-chequeo

1. ¿Qué demuestra Ed25519 y qué no demuestra?
2. ¿Por qué una firma válida no concede permisos por sí sola?
3. ¿Cómo evita la delegación la ampliación de privilegios?
4. ¿Por qué el trust score no puede reemplazar a la política?
5. ¿Qué ocurre con un hijo cuando se revoca su padre?

## Limitaciones honestas

- El DID es didáctico y no es una DID Method interoperable.
- Ed25519 demuestra posesión de una clave, no identidad civil ni legitimidad.
- La custodia segura de claves queda fuera del laboratorio.
- El score puede ser engañoso si sus eventos de entrada no son confiables.
