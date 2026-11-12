import type { AiToolDef } from '../types'
import { BRIEF, CLOZE_CARD, ID } from './shapes'

export const cardsMakeCloze: AiToolDef = {
  id: 'cards.make_cloze',
  version: 1,
  label: 'Make fill-in-the-blank cards',
  group: 'Cards',
  summary: 'Turns the notes into cards with hidden words.',
  aiDescription:
    'Adds fill-in-the-blank cards to an existing page, under its Recall cards heading. Each card text hides words as {{word}}. Needs pageId from an earlier step. Give cards, or a count and a brief. For question and answer cards use cards.make_recall.',
  inputs: {
    type: 'object',
    required: ['pageId'],
    additionalProperties: false,
    anyOf: [{ required: ['cards'] }, { required: ['count'] }],
    properties: {
      pageId: ID,
      count: { type: 'integer', minimum: 1, maximum: 200 },
      brief: BRIEF,
      cards: { type: 'array', minItems: 1, maxItems: 200, items: CLOZE_CARD },
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
  cost: { class: 'small', fill: 'model', outTokens: 700 },
  tier: 'simple',
  reversible: 'batch',
  risk: 'direct',
  idempotent: true,
  limits: { timeoutMs: 60000, maxRetries: 3 },
  surfaces: ['app', 'mcp'],
  offline: false,
  examples: {
    good: [
      { pageId: 'p1', count: 5, brief: 'Key terms only' },
      {
        pageId: 'p1',
        cards: [{ kind: 'cloze', text: 'The {{heart}} pumps blood.' }],
      },
    ],
    bad: [
      { args: { count: 3 }, path: '/pageId' },
      {
        args: {
          pageId: 'p1',
          cards: [{ kind: 'cloze', text: 'No blank here' }],
        },
        path: '/cards/0/text',
      },
      {
        args: { pageId: 'p1', cards: [{ kind: 'qa', q: 'a', a: 'b' }] },
        path: '/cards/0/kind',
      },
      { args: { pageId: 'p1', count: 201 }, path: '/count' },
    ],
  },
}
