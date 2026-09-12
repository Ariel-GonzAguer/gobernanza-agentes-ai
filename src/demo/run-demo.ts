// ─── Demo ejecutable del agente de juguete ───

import { runAgent } from '../agent/agent-loop';
import { FakeModel } from '../agent/model';
import { createWorld } from '../agent/tools/world';

const world = createWorld();

// Guion: busca, escribe un archivo, envía un correo y cierra.
const model = new FakeModel([
  { kind: 'tool_call', call: { id: 'call-1', name: 'search.web', args: { query: 'gobernanza de agentes OWASP' } } },
  {
    kind: 'tool_call',
    call: {
      id: 'call-2',
      name: 'files.write',
      args: { path: 'informe.md', content: 'Borrador: la gobernanza exige políticas deterministas.' },
    },
  },
  {
    kind: 'tool_call',
    call: {
      id: 'call-3',
      name: 'email.send',
      args: { to: 'equipo@example.com', subject: 'Borrador listo', body: 'Adjunto el borrador del informe.' },
    },
  },
  { kind: 'final', content: 'Listo: busqué, escribí informe.md y avisé por correo al equipo.' },
]);

const result = await runAgent({
  model,
  world,
  task: 'Investiga gobernanza de agentes y prepara un borrador para el equipo.',
});

console.log('── Tool calls ejecutadas ──');
for (const { call, result: toolResult } of result.executedToolCalls) {
  const estado = toolResult.ok ? 'ok' : `error: ${toolResult.error ?? 'sin detalle'}`;
  console.log(`- ${call.name} → ${estado}`);
}

console.log('\n── Respuesta final ──');
console.log(result.final);

console.log('\n── Estado del mundo ──');
console.log(`Archivos: ${[...world.files.keys()].join(', ')}`);
console.log(`Correos enviados: ${world.emails.length}`);

console.log('\nNota: sin capa de gobernanza todavía — las fases 1+ añaden el gate que decide qué tool calls se ejecutan.');
