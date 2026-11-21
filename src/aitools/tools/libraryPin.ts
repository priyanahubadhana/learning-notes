import type { AiToolDef } from '../types'
import { ID } from './shapes'

export const libraryPin: AiToolDef = {
  id: 'library.pin',
  version: 1,
  label: 'Pin notebook',
  group: 'Library',
  summary: 'Pins a notebook to the top, or unpins it.',
  aiDescription:
    'Pins one existing notebook to the top of the shelf and list, or unpins it. Needs notebookId and pinned (true or false). Changes only the pin; never touches notes.',
  inputs: {
    type: 'object',
    required: ['notebookId', 'pinned'],
    additionalProperties: false,
    properties: { notebookId: ID, pinned: { type: 'boolean' } },
  },
  outputs: {
    type: 'object',
    properties: { notebookId: { type: 'string' } },
  },
  writes: [{ target: 'library', mode: 'edit' }],
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
    good: [{ notebookId: 'nb1', pinned: true }],
    bad: [
      { args: { pinned: true }, path: '/notebookId' },
      { args: { notebookId: 'nb1' }, path: '/pinned' },
      { args: { notebookId: 'nb1', pinned: 'yes' }, path: '/pinned' },
    ],
  },
}
