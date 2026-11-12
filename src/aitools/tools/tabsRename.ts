import type { AiToolDef } from '../types'
import { ID } from './shapes'

export const tabsRename: AiToolDef = {
  id: 'tabs.rename',
  version: 1,
  label: 'Rename tab',
  group: 'Tabs',
  summary: 'Gives a notebook tab its own name.',
  aiDescription:
    'Renames one tab of an existing notebook (tabs are notes, summary, database, cards, revise). Needs notebookId and tabId. Changes the name only; never touches the pages. Not for hiding a tab.',
  inputs: {
    type: 'object',
    required: ['notebookId', 'tabId', 'title'],
    additionalProperties: false,
    properties: {
      notebookId: ID,
      tabId: ID,
      title: { type: 'string', minLength: 1, maxLength: 60 },
      baseRev: { type: 'integer', minimum: 0 },
    },
  },
  outputs: {
    type: 'object',
    properties: { notebookId: { type: 'string' } },
  },
  writes: [{ target: 'tab', mode: 'edit' }],
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
    good: [
      { notebookId: 'nb1', tabId: 'cards', title: 'Quiz me' },
      { notebookId: 'nb1', tabId: 'notes', title: 'Lecture notes' },
    ],
    bad: [
      { args: { tabId: 'cards', title: 'x' }, path: '/notebookId' },
      { args: { notebookId: 'nb1', title: 'x' }, path: '/tabId' },
      { args: { notebookId: 'nb1', tabId: 'cards' }, path: '/title' },
      {
        args: { notebookId: 'nb1', tabId: 'cards', title: 'x'.repeat(61) },
        path: '/title',
      },
      {
        args: { notebookId: 'nb1', tabId: 'cards', title: 'x', baseRev: -1 },
        path: '/baseRev',
      },
    ],
  },
}
