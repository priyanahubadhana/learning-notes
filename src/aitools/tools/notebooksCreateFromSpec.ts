import type { AiToolDef } from '../types'

/**
 * A whole notebook in one step: pages, blocks, recall cards (and databases
 * where the connector can make them), from a spec of schema `ln-spec/1`. This
 * is what the connector's `create_notebook` runs. The spec is checked by the
 * same checker as before (`validateSpec`), so its exact-path errors stay.
 */
export const notebooksCreateFromSpec: AiToolDef = {
  id: 'notebooks.create_from_spec',
  version: 1,
  label: 'Create notebook from a spec',
  group: 'Notebooks',
  summary: 'Makes a whole notebook (pages, cards) from one written spec.',
  aiDescription:
    'Creates a new notebook with all its pages, blocks and recall cards in one step, from a complete ln-spec/1 spec. Use when you already have all the content. For step-by-step building use notebooks.create and then pages.write_notes. Never changes existing notebooks.',
  inputs: {
    type: 'object',
    required: ['spec'],
    additionalProperties: false,
    properties: {
      spec: {
        type: 'object',
        description:
          'A notebook spec: { version: "ln-spec/1", title, summary?, style?, pages: [...], cards?: [...] }.',
      },
    },
  },
  outputs: {
    type: 'object',
    properties: {
      notebookId: { type: 'string' },
      pageIds: { type: 'array', items: { type: 'string' } },
      counts: { type: 'object' },
    },
  },
  writes: [
    { target: 'notebook', mode: 'create' },
    { target: 'page', mode: 'create' },
    { target: 'cards', mode: 'create' },
  ],
  permissions: {
    scope: 'notes:write',
    respectsLocks: true,
    needsSources: false,
  },
  cost: { class: 'none', fill: 'caller', outTokens: 0 },
  tier: 'writing',
  reversible: 'batch',
  risk: 'direct',
  idempotent: true,
  limits: { timeoutMs: 30000, maxRetries: 0 },
  surfaces: ['mcp'],
  offline: false,
  examples: {
    good: [
      {
        spec: {
          version: 'ln-spec/1',
          title: 'Chemistry',
          pages: [
            {
              title: 'Atoms',
              blocks: [
                { type: 'paragraph', text: 'An **atom** has a nucleus.' },
              ],
            },
          ],
          cards: [{ kind: 'qa', q: 'What is in a nucleus?', a: 'Protons.' }],
        },
      },
    ],
    bad: [
      { args: {}, path: '/spec' },
      { args: { spec: 'text' }, path: '/spec' },
      { args: { spec: {}, extra: 1 }, path: '/extra' },
    ],
  },
}
