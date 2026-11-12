import type { AiToolDef } from '../types'
import { ID } from './shapes'

export const layoutsSetPathStyle: AiToolDef = {
  id: 'layouts.set_path_style',
  version: 1,
  label: 'Change page path',
  group: 'Layouts',
  summary: 'Sets how the path above a page is shown.',
  aiDescription:
    'Sets how the path above one existing page is shown: simple, full or page. Use inherit to follow the notebook again. Needs pageId and pathStyle. Changes only that page; never touches notes. Not for notebook-wide styles.',
  inputs: {
    type: 'object',
    required: ['pageId', 'pathStyle'],
    additionalProperties: false,
    properties: {
      pageId: ID,
      pathStyle: { enum: ['simple', 'full', 'page', 'inherit'] },
    },
  },
  outputs: {
    type: 'object',
    properties: { pageId: { type: 'string' } },
  },
  writes: [{ target: 'page', mode: 'edit' }],
  permissions: {
    scope: 'notes:write',
    respectsLocks: true,
    needsSources: false,
  },
  cost: { class: 'none', fill: 'none', outTokens: 0 },
  tier: 'simple',
  reversible: 'values',
  risk: 'direct',
  idempotent: true,
  limits: { timeoutMs: 30000, maxRetries: 3 },
  surfaces: ['app', 'mcp'],
  offline: true,
  examples: {
    good: [
      { pageId: 'p1', pathStyle: 'full' },
      { pageId: 'p1', pathStyle: 'page' },
    ],
    bad: [
      { args: { pathStyle: 'full' }, path: '/pageId' },
      { args: { pageId: 'p1' }, path: '/pathStyle' },
      { args: { pageId: 'p1', pathStyle: 'deep' }, path: '/pathStyle' },
    ],
  },
}
