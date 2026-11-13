import type { AiToolDef } from '../types'
import { BRIEF, ID } from './shapes'

export const mindmapsAdd: AiToolDef = {
  id: 'mindmaps.add',
  version: 1,
  label: 'Add mind map',
  group: 'Mind maps',
  summary: 'Adds an editable mind map to a page.',
  aiDescription:
    'Adds one mind map block at the end of an existing page. Needs pageId. Send a brief, or the finished outline: an indented list where the first line is the central topic and each deeper level is indented by two spaces. The map stays editable (never a picture). Not for notes or cards.',
  inputs: {
    type: 'object',
    required: ['pageId'],
    additionalProperties: false,
    anyOf: [{ required: ['outline'] }, { required: ['brief'] }],
    properties: {
      pageId: ID,
      brief: BRIEF,
      outline: { type: 'string', minLength: 1, maxLength: 8000 },
      baseRevision: { type: 'string', minLength: 1, maxLength: 64 },
    },
  },
  outputs: {
    type: 'object',
    properties: { pageId: { type: 'string' }, blockId: { type: 'string' } },
  },
  writes: [{ target: 'blocks', mode: 'append' }],
  permissions: {
    scope: 'notes:write',
    respectsLocks: true,
    needsSources: true,
  },
  cost: { class: 'small', fill: 'model', outTokens: 500 },
  tier: 'writing',
  reversible: 'values',
  risk: 'direct',
  idempotent: true,
  limits: { timeoutMs: 60000, maxRetries: 3 },
  surfaces: ['app'],
  offline: false,
  examples: {
    good: [
      { pageId: 'p1', brief: 'The main ideas as a map' },
      { pageId: 'p1', outline: 'Habits\n  Cue\n  Craving\n  Response' },
    ],
    bad: [
      { args: { brief: 'x' }, path: '/pageId' },
      { args: { pageId: 'p1' }, path: '' },
      { args: { pageId: 'p1', outline: '' }, path: '/outline' },
      { args: { pageId: 'p1', outline: 'x'.repeat(8001) }, path: '/outline' },
      { args: { pageId: 'p1', brief: 'x', extra: 1 }, path: '/extra' },
    ],
  },
}
