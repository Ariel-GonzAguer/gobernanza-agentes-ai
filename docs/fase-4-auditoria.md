# Fase 4 — Auditoría tamper-evident

**Estado**: material preparado; implementación pendiente.

## Propósito

Una decisión bloqueada no alcanza si después no podemos demostrar qué ocurrió. En esta fase vas a registrar decisiones y resultados en una cadena verificable.

La pregunta de esta fase es:

> ¿Qué evidencia mínima permite reconstruir una acción y detectar alteraciones posteriores?

## Prerrequisitos

- Fases 1 a 3 cerradas.
- Comprensión de calls canónicas, efectos y redacción de PII.
- Uso de `node:crypto` para SHA-256.

## Alcance

### Incluido

- Registro append-only en memoria.
- Hash chain con SHA-256.
- Génesis de 64 ceros.
- Digest estable de valores canónicos.
- Verificación de integridad.
- Filtros y exportación JSON.
- Versión y hash de política en cada evento.

### Fuera de alcance

- Base de datos de auditoría.
- Firma externa de checkpoints.
- Inmutabilidad física del almacenamiento.
- Detección de una reescritura completa sin ancla externa.
- Registro de PII sin tratar.

## Estructura esperada

```text
src/governance/audit/
├─ types.ts
├─ digest.ts
├─ logger.ts
└─ README.md
```

El test preparado está en `src/tests/future/audit.test.ts`.

## Contrato público

```ts
import type { GateEffect } from '../../agent/types';

export interface AuditEvent {
  agentDid: string;
  tool: string;
  argsDigest: string;
  effect: GateEffect;
  reason: string;
  policyVersion: string;
  policyHash: string;
  result?: {
    ok: boolean;
    error?: string;
  };
}

export interface AuditEntry extends AuditEvent {
  sequence: number;
  timestamp: string;
  previousHash: string;
  hash: string;
}

export interface AuditFilter {
  agentDid?: string;
  tool?: string;
  effect?: GateEffect;
}

export class AuditLogger {
  constructor(options?: { clock?: () => string });
  append(event: AuditEvent): AuditEntry;
  entries(): readonly AuditEntry[];
  verify(): boolean;
  filter(filter: AuditFilter): AuditEntry[];
  exportJson(): string;
  static fromJson(source: string): AuditLogger;
}

export function digestCanonical(value: unknown): string;
```

## Semántica de la cadena

1. La primera entrada usa `64` ceros como `previousHash`.
2. Cada entrada incluye el hash de la anterior.
3. El hash cubre todos los campos relevantes, incluido `previousHash`.
4. `sequence` comienza en cero o uno, pero debe ser consistente y documentado.
5. `digestCanonical` produce el mismo digest aunque cambie el orden de propiedades.
6. `verify()` comprueba secuencia, hash anterior y hash propio.
7. El logger registra tanto `allow` como `deny` y `require_approval`.
8. La entrada debe contener versión y hash de política.
9. Los valores auditados deben estar tratados antes de persistirse.

## Criterios de aceptación

- [ ] Una cadena de varias entradas verifica correctamente.
- [ ] Alterar un campo rompe `verify()`.
- [ ] Alterar `previousHash` rompe `verify()`.
- [ ] El génesis es correcto.
- [ ] El digest es estable frente al orden de propiedades.
- [ ] Los filtros por agente, tool y efecto funcionan.
- [ ] Exportar y cargar conserva la cadena.
- [ ] La versión y el hash de política quedan registrados.
- [ ] Una decisión `deny` también queda registrada.
- [ ] La entrada no conserva PII sin tratar.

## Pistas escalonadas

### Bloque A, digest canónico

1. **Mapa**: el problema no es SHA-256, sino serializar de forma estable.
2. **Estrategia**: normaliza recursivamente objetos por claves ordenadas antes de serializar.
3. **Trampas**: arrays conservan su orden; `undefined` debe tener una regla explícita.

### Bloque B, cadena

1. **Mapa**: cada entrada depende de la anterior.
2. **Estrategia**: construye el contenido completo, calcula hash y recién después congela la entrada.
3. **Trampas**: no calcules el hash con un campo `hash` anterior incluido.

### Bloque C, verificación

1. **Mapa**: verificar significa recalcular, no confiar en el valor guardado.
2. **Estrategia**: recorre en orden y compara todos los enlaces.
3. **Trampas**: una cadena vacía puede ser válida; define su comportamiento explícitamente.

## Auto-chequeo

1. ¿Qué detecta una hash chain?
2. ¿Por qué no demuestra que nadie reescribió toda la cadena?
3. ¿Por qué se registra también una decisión `deny`?
4. ¿Por qué el digest de argumentos debe usar la call canónica?
5. ¿Qué riesgo introduce auditar antes de redactar PII?

## Limitaciones honestas

- Una cadena en memoria desaparece al reiniciar el proceso.
- Un atacante que reescribe toda la cadena puede producir otra cadena internamente consistente.
- Hace falta un checkpoint o ancla externa para detectar esa reescritura.
- Tamper-evident no significa tamper-proof.
