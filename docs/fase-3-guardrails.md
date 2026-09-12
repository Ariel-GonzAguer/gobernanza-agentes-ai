# Fase 3 — Guardrails de entrada y salida

**Estado**: material preparado; implementación pendiente.

## Propósito

La política controla si una acción puede ejecutarse, pero el agente también procesa texto no confiable. En esta fase vas a construir un pipeline pequeño para limitar entradas, detectar señales de prompt injection y tratar salidas antes de mostrarlas o registrarlas.

La pregunta de esta fase es:

> ¿Cómo reducimos el daño de contenido malformado o sensible sin confundir un guardrail con una autorización?

## Prerrequisitos

- Fases 1 y 2 cerradas.
- Comprensión de la diferencia entre `sanitize`, `validate` y `authorize`.
- No agregar dependencias.

## Alcance

### Incluido

- Eliminación de caracteres de control peligrosos.
- Límite por línea y límite total.
- Detección heurística de indicios de prompt injection.
- Redacción determinista de PII en salidas.
- Integración conceptual con `ToolResult`.

### Fuera de alcance

- Clasificador de seguridad basado en un LLM.
- Promesa de detectar toda prompt injection.
- Autorización desde el texto.
- Validación de schemas duplicada fuera de `prepareToolCall`.
- DLP empresarial completo.

## Estructura esperada

```text
src/governance/guardrails/
├─ types.ts
├─ pipeline.ts
└─ README.md
```

El test preparado está en `src/tests/future/guardrails.test.ts`.

## Contrato público

```ts
import type { ToolResult } from '../../agent/types';

export type GuardrailFindingKind =
  | 'control_character'
  | 'line_truncated'
  | 'prompt_injection'
  | 'pii';

export interface GuardrailFinding {
  kind: GuardrailFindingKind;
  message: string;
}

export interface GuardrailResult<T> {
  value: T;
  findings: GuardrailFinding[];
  blocked: boolean;
}

export interface GuardrailPipeline {
  inspectInput(text: string): GuardrailResult<string>;
  inspectOutput(result: ToolResult): GuardrailResult<ToolResult>;
}

export function createGuardrailPipeline(options?: {
  maxChars?: number;
  maxLineChars?: number;
}): GuardrailPipeline;
```

## Semántica esperada

### Entrada

- Elimina caracteres de control, excepto tabulación, salto de línea y retorno de carro.
- Trunca líneas que exceden `maxLineChars`.
- Trunca el texto total si excede `maxChars`.
- Genera findings para transformaciones realizadas.
- Una señal de prompt injection genera un finding, pero no concede ni revoca permisos.
- La detección heurística debe ser explicable y determinista.

### Salida

- Examina `ToolResult.output` y `ToolResult.error` cuando sean texto.
- Redacta como mínimo emails y teléfonos reconocibles.
- Conserva la estructura general del resultado.
- Genera un finding `pii` por cada tipo de redacción.
- No debe dejar la PII original en el valor tratado.

### Autorización

Los guardrails no reemplazan estas fronteras:

```text
args crudos → prepareToolCall → args canónicos → política → ejecución
```

Sanear texto no convierte al solicitante en confiable y detectar una inyección no autoriza una tool.

## Criterios de aceptación

- [ ] Los caracteres de control se eliminan.
- [ ] Las líneas largas se truncan y dejan evidencia.
- [ ] El límite total se respeta.
- [ ] Un texto con indicios de injection conserva su contenido y genera finding.
- [ ] Un email de salida se redacta.
- [ ] Un teléfono de salida se redacta.
- [ ] La PII no aparece en el valor tratado.
- [ ] Un resultado con error también se trata.
- [ ] Los findings no convierten el texto en autorización.
- [ ] La validación de argumentos sigue centralizada en `prepareToolCall`.

## Pistas escalonadas

### Bloque A, transformación segura

1. **Mapa**: empieza por una función pura de texto.
2. **Estrategia**: separa limpieza de caracteres, límites y detección.
3. **Trampas**: no borres saltos de línea antes de aplicar el límite por línea; conserva findings.

### Bloque B, detección

1. **Mapa**: la detección es señal, no frontera de autorización.
2. **Estrategia**: define patrones pequeños y explícitos, y devuelve siempre el texto procesado.
3. **Trampas**: no declares que la heurística detecta todos los ataques ni bloquees acciones solo por un string.

### Bloque C, redacción

1. **Mapa**: la salida debe tratarse antes de mostrarse o auditarse.
2. **Estrategia**: recorre solo strings y devuelve una copia transformada.
3. **Trampas**: no mutar objetos compartidos; no conservar la PII en un campo alternativo.

## Auto-chequeo

1. ¿Por qué `sanitize` no equivale a `validate`?
2. ¿Por qué un finding de prompt injection no debe decidir permisos?
3. ¿Qué ocurre si la salida se audita antes de redactarse?
4. ¿Por qué la validación de args no debe duplicarse en este pipeline?
5. ¿Qué limitación tiene una detección heurística?

## Limitaciones honestas

- Una heurística no detecta todas las prompt injections.
- Redactar PII con patrones simples puede tener falsos positivos y negativos.
- Los guardrails no sustituyen mínimo privilegio, política, identidad ni auditoría.
- La salida tratada no prueba que la tool haya actuado de forma segura internamente.
