import type { AiToolDef } from '../types'
import { STYLE } from './shapes'

export const notebooksCreate: AiToolDef = {
  id: 'notebooks.create',
  version: 1,
  label: 'Create notebook',
  group: 'Notebooks',
  summary: 'Makes an empty notebook with a title and a look.',
  aiDescription:
    'Creates a new empty notebook. Use first when the goal needs a new notebook; later steps add pages, cards and databases with the notebookId it returns. Does not write pages. Do not use to add to an existing notebook.',
  inputs: {
    type: 'object',
    required: ['title'],
    additionalProperties: false,
    properties: {
      title: { type: 'string', minLength: 1, maxLength: 120 },
      summary: { type: 'string', maxLength: 2000 },
      style: STYLE,
    },
  },
  outputs: {
    type: 'object',
    properties: { notebookId: { type: 'string' } },
  },
  writes: [{ target: 'notebook', mode: 'create' }],
  permissions: {
    scope: 'notes:write',
    respectsLocks: true,
    needsSources: false,
  },
  cost: { class: 'none', fill: 'none', outTokens: 0 },
  tier: 'simple',
  reversible: 'batch',
  risk: 'direct',
  idempotent: true,
  limits: { timeoutMs: 30000, maxRetries: 3 },
  surfaces: ['app', 'mcp'],
  offline: true,
  examples: {
    good: [
      { title: 'Habits that stick' },
      {
        title: 'Biology',
        summary: 'Term one',
        style: { colour: '#2f6feb', view: 'tabs' },
      },
    ],
    bad: [
      { args: {}, path: '/title' },
      { args: { title: '' }, path: '/title' },
      {
        args: { title: 'x', style: { colour: 'blue' } },
        path: '/style/colour',
      },
      { args: { title: 'x', pages: [] }, path: '/pages' },
    ],
  },
}
