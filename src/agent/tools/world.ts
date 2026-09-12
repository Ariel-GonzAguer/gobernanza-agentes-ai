// ─── Mundo simulado ───

import type { SimulatedWorld } from '../types';

/**
 * Crea un mundo simulado con datos de ejemplo para las tools de juguete.
 *
 * @returns Mundo con archivos, correos y una base de datos en memoria.
 * @example
 * const world = createWorld();
 * world.files.get('notas.md'); // 'Notas iniciales del proyecto de gobernanza.'
 */
export function createWorld(): SimulatedWorld {
  return {
    files: new Map<string, string>([
      ['notas.md', 'Notas iniciales del proyecto de gobernanza.'],
      ['politica-borrador.txt', 'Toda acción destructiva requiere aprobación humana.'],
    ]),
    emails: [],
    db: {
      table: 'usuarios',
      rows: [
        { id: 1, nombre: 'Ana', rol: 'admin' },
        { id: 2, nombre: 'Luis', rol: 'analista' },
        { id: 3, nombre: 'Sofía', rol: 'viewer' },
      ],
    },
  };
}
