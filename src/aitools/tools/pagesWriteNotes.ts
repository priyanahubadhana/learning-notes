import type { AiToolDef } from '../types'
import { BRIEF, ID, PAGE } from './shapes'

export const pagesWriteNotes: AiToolDef = {
  id: 'pages.write_notes',
  version: 1,
  label: 'Write notes',
  group: 'Pages',
  summary: 'Adds a page of notes to a notebook.',
  aiDescription:
    'Adds one page of notes to a notebook. Needs notebookId (from an earlier step or the destination). Send a short brief, or the full page when you already have the content. Do not use for cards or databases; chain the other tools.',
  inputs: {
    type: 'object',
    required: ['notebookId'],
    additionalProperties: false,
    anyOf: [{ required: ['brief'] }, { required: ['page'] }],
    properties: {
      notebookId: ID,
      brief: BRIEF,
      page: PAGE,
      parentId: ID,
      parentVersion: { type: 'string', minLength: 1, maxLength: 64 },
    },
  },
  outputs: {
    type: 'object',
    properties: { pageId: { type: 'string' }, notebookId: { type: 'string' } },
  },
  writes: [{ target: 'page', mode: 'create' }],
  permissions: {
    scope: 'notes:write',
    respectsLocks: true,
    needsSources: true,
  },
  cost: { class: 'medium', fill: 'model', outTokens: 1500 },
  tier: 'writing',
  reversible: 'batch',
  risk: 'direct',
  idempotent: true,
  limits: { timeoutMs: 90000, maxRetries: 3 },
  surfaces: ['app', 'mcp'],
  offline: false,
  examples: {
    good: [
      { notebookId: 'nb1', brief: 'Clear notes with headings' },
      {
        notebookId: 'nb1',
        page: {
          title: 'Cells',
          blocks: [
            { type: 'heading', level: 1, text: 'Cells' },
            { type: 'paragraph', text: 'The **cell** is the unit of life.' },
          ],
        },
      },
    ],
    bad: [
      { args: { brief: 'x' }, path: '/notebookId' },
      { args: { notebookId: 'nb1' }, path: '' },
      { args: { notebookId: 'a b', brief: 'x' }, path: '/notebookId' },
      {
        args: {
          notebookId: 'nb1',
          page: { title: 'T', blocks: [{ type: 'nope' }] },
        },
        path: '/page/blocks/0/type',
      },
      { args: { notebookId: 'nb1', brief: 'x', extra: 1 }, path: '/extra' },
    ],
  },
}
