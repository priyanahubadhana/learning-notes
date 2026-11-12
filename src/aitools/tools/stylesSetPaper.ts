import type { AiToolDef } from '../types'
import { ID } from './shapes'

export const stylesSetPaper: AiToolDef = {
  id: 'styles.set_paper',
  version: 1,
  label: 'Change paper',
  group: 'Styles',
  summary: 'Sets the paper behind the drawing on a page.',
  aiDescription:
    'Sets the paper behind the ink of one existing page: plain, lined, grid or dots. Needs pageId and paper. Changes only the paper; never touches notes or drawings. Not for notebook colours (use styles.apply).',
  inputs: {
    type: 'object',
    required: ['pageId', 'paper'],
    additionalProperties: false,
    properties: {
      pageId: ID,
      paper: { enum: ['plain', 'lined', 'grid', 'dots'] },
    },
  },
  outputs: {
    type: 'object',
    properties: { pageId: { type: 'string' } },
  },
  writes: [{ target: 'style', mode: 'edit' }],
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
      { pageId: 'p1', paper: 'grid' },
      { pageId: 'p1', paper: 'dots' },
    ],
    bad: [
      { args: { paper: 'grid' }, path: '/pageId' },
      { args: { pageId: 'p1' }, path: '/paper' },
      { args: { pageId: 'p1', paper: 'marble' }, path: '/paper' },
    ],
  },
}
