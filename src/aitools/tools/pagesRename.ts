import type { AiToolDef } from '../types'
import { ID } from './shapes'

export const pagesRename: AiToolDef = {
  id: 'pages.rename',
  version: 1,
  label: 'Rename page',
  group: 'Pages',
  summary: 'Gives an existing page a new title.',
  aiDescription:
    'Changes the title of one existing page. Needs pageId (from an earlier step or the destination) and the new title. Changes the title only; never touches the content. Not for writing or tidying notes.',
  inputs: {
    type: 'object',
    required: ['pageId', 'title'],
    additionalProperties: false,
    properties: {
      pageId: ID,
      title: { type: 'string', minLength: 1, maxLength: 200 },
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
      { pageId: 'p1', title: 'Habit loops' },
      { pageId: 'p1', title: 'Cells and “membranes”' },
    ],
    bad: [
      { args: { title: 'x' }, path: '/pageId' },
      { args: { pageId: 'p1' }, path: '/title' },
      { args: { pageId: 'p1', title: '' }, path: '/title' },
      { args: { pageId: 'p1', title: 'x'.repeat(201) }, path: '/title' },
      { args: { pageId: 'p1', title: 'x', extra: 1 }, path: '/extra' },
    ],
  },
}
