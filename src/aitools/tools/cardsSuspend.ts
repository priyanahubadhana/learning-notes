import type { AiToolDef } from '../types'
import { ID } from './shapes'

export const cardsSuspend: AiToolDef = {
  id: 'cards.suspend',
  version: 1,
  label: 'Set a card aside',
  group: 'Cards',
  summary: 'Sets a card aside from reviews, or brings it back.',
  aiDescription:
    'Suspends or brings back one existing recall card. Needs cardId and suspended (true or false). A suspended card stays saved and keeps its history but never appears in reviews. Never deletes a card and never edits its text.',
  inputs: {
    type: 'object',
    required: ['cardId', 'suspended'],
    additionalProperties: false,
    properties: {
      cardId: ID,
      suspended: { type: 'boolean' },
    },
  },
  outputs: {
    type: 'object',
    properties: { cardId: { type: 'string' } },
  },
  writes: [{ target: 'cards', mode: 'edit' }],
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
    good: [{ cardId: 'c1', suspended: true }],
    bad: [
      { args: { suspended: true }, path: '/cardId' },
      { args: { cardId: 'c1' }, path: '/suspended' },
      { args: { cardId: 'c1', suspended: 'yes' }, path: '/suspended' },
      { args: { cardId: 'c1', suspended: true, extra: 1 }, path: '/extra' },
    ],
  },
}
