import type { AiToolDef } from '../types'
import { ID } from './shapes'

export const tagsAdd: AiToolDef = {
  id: 'tags.add',
  version: 1,
  label: 'Add tag',
  group: 'Tags',
  summary: 'Puts a tag on a page.',
  aiDescription:
    'Puts one tag on one existing page. Needs pageId and tag (a name, or a path like medicine/cardio; a missing tag is made). Changes only the tag list of that page. Not for removing tags (use tags.remove) or renaming them.',
  inputs: {
    type: 'object',
    required: ['pageId', 'tag'],
    additionalProperties: false,
    properties: {
      pageId: ID,
      tag: { type: 'string', minLength: 1, maxLength: 200 },
    },
  },
  outputs: {
    type: 'object',
    properties: { pageId: { type: 'string' }, tagId: { type: 'string' } },
  },
  writes: [
    { target: 'tags', mode: 'create' },
    { target: 'page', mode: 'edit' },
  ],
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
      { pageId: 'p1', tag: 'biology' },
      { pageId: 'p1', tag: 'medicine/cardio' },
    ],
    bad: [
      { args: { tag: 'x' }, path: '/pageId' },
      { args: { pageId: 'p1' }, path: '/tag' },
      { args: { pageId: 'p1', tag: '' }, path: '/tag' },
      { args: { pageId: 'p1', tag: 'x'.repeat(201) }, path: '/tag' },
      { args: { pageId: 'p1', tag: 'x', extra: 1 }, path: '/extra' },
    ],
  },
}
