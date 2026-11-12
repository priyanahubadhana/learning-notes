import type { AiToolDef } from '../types'
import { BRIEF, ID, QA_CARD } from './shapes'

export const cardsMakeRecall: AiToolDef = {
  id: 'cards.make_recall',
  version: 1,
  label: 'Make recall cards',
  group: 'Cards',
  summary: 'Turns the notes into question and answer cards.',
  aiDescription:
    'Adds question and answer cards to an existing page, under its Recall cards heading. Needs pageId from an earlier step. Give cards, or a count and a brief. For fill-in-the-blank cards use cards.make_cloze. Not for quizzes.',
  inputs: {
    type: 'object',
    required: ['pageId'],
    additionalProperties: false,
    anyOf: [{ required: ['cards'] }, { required: ['count'] }],
    properties: {
      pageId: ID,
      count: { type: 'integer', minimum: 1, maximum: 200 },
      brief: BRIEF,
      cards: { type: 'array', minItems: 1, maxItems: 200, items: QA_CARD },
      expectedVersion: { type: 'string', minLength: 1, maxLength: 64 },
    },
  },
  outputs: {
    type: 'object',
    properties: {
      pageId: { type: 'string' },
      cardIds: { type: 'array', items: { type: 'string' } },
    },
  },
  writes: [
    { target: 'blocks', mode: 'append' },
    { target: 'cards', mode: 'create' },
  ],
  permissions: {
    scope: 'notes:write',
    respectsLocks: true,
    needsSources: true,
  },
  cost: { class: 'small', fill: 'model', outTokens: 900 },
  tier: 'simple',
  reversible: 'batch',
  risk: 'direct',
  idempotent: true,
  limits: { timeoutMs: 60000, maxRetries: 3 },
  surfaces: ['app', 'mcp'],
  offline: false,
  examples: {
    good: [
      { pageId: 'p1', count: 10 },
      {
        pageId: 'p1',
        cards: [{ kind: 'qa', q: 'What is a cell?', a: 'The unit of life.' }],
      },
    ],
    bad: [
      { args: { count: 10 }, path: '/pageId' },
      { args: { pageId: 'p1' }, path: '' },
      { args: { pageId: 'p1', count: 0 }, path: '/count' },
      { args: { pageId: 'p1', count: 2.5 }, path: '/count' },
      { args: { pageId: 'p1', cards: [] }, path: '/cards' },
      {
        args: { pageId: 'p1', cards: [{ kind: 'qa', q: 'x' }] },
        path: '/cards/0/a',
      },
    ],
  },
}
