import type { AiToolDef } from '../types'
import { ID } from './shapes'

export const tagsRename: AiToolDef = {
  id: 'tags.rename',
  version: 1,
  label: 'Rename tag',
  group: 'Tags',
  summary: 'Gives a tag a new name.',
  aiDescription:
    'Renames one existing tag (one level only; its sub-tags keep their names). Needs tagId and name. The new name shows on every page that has the tag. Not for moving or deleting a tag.',
  inputs: {
    type: 'object',
    required: ['tagId', 'name'],
    additionalProperties: false,
    properties: {
      tagId: ID,
      name: { type: 'string', minLength: 1, maxLength: 60 },
    },
  },
  outputs: {
    type: 'object',
    properties: { tagId: { type: 'string' } },
  },
  writes: [{ target: 'tags', mode: 'edit' }],
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
  surfaces: ['app'],
  offline: true,
  examples: {
    good: [
      { tagId: 't1', name: 'cardiology' },
      { tagId: 't1', name: 'Heart-Sounds' },
    ],
    bad: [
      { args: { name: 'x' }, path: '/tagId' },
      { args: { tagId: 't1' }, path: '/name' },
      { args: { tagId: 't1', name: '' }, path: '/name' },
      { args: { tagId: 't1', name: 'x'.repeat(61) }, path: '/name' },
    ],
  },
}
