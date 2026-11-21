import type { AiToolDef } from '../types'
import { ID } from './shapes'

export const tabsSetHidden: AiToolDef = {
  id: 'tabs.set_hidden',
  version: 1,
  label: 'Show or hide tab',
  group: 'Tabs',
  summary: 'Hides a notebook tab, or shows it again.',
  aiDescription:
    'Hides or shows one tab of an existing notebook. Hidden tabs keep everything inside and can be shown again. Needs notebookId, tabId and hidden (true or false). Never deletes a tab. Not for renaming.',
  inputs: {
    type: 'object',
    required: ['notebookId', 'tabId', 'hidden'],
    additionalProperties: false,
    properties: {
      notebookId: ID,
      tabId: ID,
      hidden: { type: 'boolean' },
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
      { notebookId: 'nb1', tabId: 'revise', hidden: true },
      { notebookId: 'nb1', tabId: 'database', hidden: true },
    ],
    bad: [
      { args: { tabId: 'cards', hidden: true }, path: '/notebookId' },
      { args: { notebookId: 'nb1', hidden: true }, path: '/tabId' },
      { args: { notebookId: 'nb1', tabId: 'cards' }, path: '/hidden' },
      {
        args: { notebookId: 'nb1', tabId: 'cards', hidden: 'yes' },
        path: '/hidden',
      },
    ],
  },
}
