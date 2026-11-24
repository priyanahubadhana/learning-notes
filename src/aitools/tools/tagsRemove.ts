import type { AiToolDef } from '../types'
import { ID } from './shapes'

export const tagsRemove: AiToolDef = {
  id: 'tags.remove',
  version: 1,
  label: 'Remove tag',
  group: 'Tags',
  summary: 'Takes a tag off a page.',
  aiDescription:
    'Takes one tag off one existing page. Needs pageId and tagId. The tag itself and every other page keep it. Not for deleting or renaming a tag.',
  inputs: {
    type: 'object',
    required: ['pageId', 'tagId'],
    additionalProperties: false,
    properties: { pageId: ID, tagId: ID },
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
    good: [{ pageId: 'p1', tagId: 't1' }],
    bad: [
      { args: { tagId: 't1' }, path: '/pageId' },
      { args: { pageId: 'p1' }, path: '/tagId' },
      { args: { pageId: 'p1', tagId: 'bad id' }, path: '/tagId' },
    ],
  },
}
