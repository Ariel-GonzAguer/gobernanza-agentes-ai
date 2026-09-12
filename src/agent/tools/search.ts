// ─── Tool: búsqueda web simulada ───

import { z } from 'zod';
import type { ToolDefinition, ToolResult } from '../types';

/** Esquema de argumentos de `search.web`. */
export const searchSchema = z.object({
  query: z.string().min(1).max(300),
});

/** Busca en una web simulada y devuelve resultados de ejemplo. */
export const searchWebTool: ToolDefinition = {
  name: 'search.web',
  description: 'Busca en la web simulada y devuelve resultados de ejemplo.',
  schema: searchSchema,
  execute(args): ToolResult {
    const { query } = searchSchema.parse(args);
    return {
      ok: true,
      output: {
        query,
        results: [
          { title: 'OWASP Top 10 for Agentic Applications 2026', url: 'https://genai.owasp.org' },
          { title: 'Agent Governance Toolkit (Microsoft)', url: 'https://github.com/microsoft/agent-governance-toolkit' },
          { title: 'NIST AI Risk Management Framework', url: 'https://www.nist.gov/itl/ai-risk-management-framework' },
        ],
      },
    };
  },
};
