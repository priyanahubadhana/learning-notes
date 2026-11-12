import type { AiToolDef } from '../types'
import { BRIEF, ID } from './shapes'

export const summariesSet: AiToolDef = {
  id: 'summaries.set',
  version: 1,
  label: 'Write summary',
  group: 'Summaries',
  summary: 'Sets the short summary of a lesson page.',
  aiDescription:
    'Sets the short summary shown on a top-level lesson page. Needs pageId. Send a brief, or the finished summary text when you already have it. Replaces the old summary (History keeps it). Not for notes or cards.',
  inputs: {
    type: 'object',
    required: ['pageId'],
    additionalProperties: false,
    anyOf: [{ required: ['summary'] }, { required: ['brief'] }],
    properties: {
      pageId: ID,
      brief: BRIEF,
      summary: { type: 'string', minLength: 1, maxLength: 2000 },
      baseRevision: { type: 'string', minLength: 1, maxLength: 64 },
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
    needsSources: true,
  },
  cost: { class: 'small', fill: 'model', outTokens: 300 },
  tier: 'writing',
  reversible: 'values',
  risk: 'direct',
  idempotent: true,
  limits: { timeoutMs: 60000, maxRetries: 3 },
  surfaces: ['app', 'mcp'],
  offline: false,
  examples: {
    good: [
      { pageId: 'p1', brief: 'Three sentences, plain words' },
      { pageId: 'p1', summary: 'A habit is a loop of cue, craving, response.' },
    ],
    bad: [
      { args: { brief: 'x' }, path: '/pageId' },
      { args: { pageId: 'p1' }, path: '' },
      { args: { pageId: 'p1', summary: '' }, path: '/summary' },
      { args: { pageId: 'p1', summary: 'x'.repeat(2001) }, path: '/summary' },
      { args: { pageId: 'p1', brief: 'x', extra: true }, path: '/extra' },
    ],
  },
}
