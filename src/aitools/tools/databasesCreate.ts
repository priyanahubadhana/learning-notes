import type { AiToolDef } from '../types'
import { BRIEF, DATABASE, ID } from './shapes'

export const databasesCreate: AiToolDef = {
  id: 'databases.create',
  version: 1,
  label: 'Create database',
  group: 'Databases',
  summary: 'Adds a table of rows with three starter views.',
  aiDescription:
    'Adds one database (columns and rows) to a notebook, with three starter views, and can show it at the end of a page. Needs notebookId from an earlier step. Give the database, or a brief. Use for lists with fields; use pages for prose.',
  inputs: {
    type: 'object',
    required: ['notebookId'],
    additionalProperties: false,
    anyOf: [{ required: ['database'] }, { required: ['brief'] }],
    properties: {
      notebookId: ID,
      pageId: ID,
      brief: BRIEF,
      database: DATABASE,
    },
  },
  outputs: {
    type: 'object',
    properties: {
      notebookId: { type: 'string' },
      databaseId: { type: 'string' },
    },
  },
  writes: [
    { target: 'database', mode: 'create' },
    { target: 'rows', mode: 'create' },
  ],
  permissions: {
    scope: 'notes:write',
    respectsLocks: true,
    needsSources: true,
  },
  cost: { class: 'small', fill: 'model', outTokens: 1000 },
  tier: 'simple',
  reversible: 'batch',
  risk: 'direct',
  idempotent: true,
  limits: { timeoutMs: 60000, maxRetries: 3 },
  surfaces: ['app', 'mcp'],
  offline: false,
  examples: {
    good: [
      { notebookId: 'nb1', brief: 'A reading list' },
      {
        notebookId: 'nb1',
        database: {
          key: 'books',
          title: 'Books',
          columns: [
            { name: 'Status', type: 'choice', options: ['To read', 'Done'] },
          ],
          rows: [{ title: 'Atomic Habits', values: { Status: 'Done' } }],
        },
      },
    ],
    bad: [
      { args: { brief: 'x' }, path: '/notebookId' },
      {
        args: {
          notebookId: 'nb1',
          database: {
            key: 'Bad Key',
            title: 'T',
            columns: [{ name: 'a', type: 'text' }],
            rows: [],
          },
        },
        path: '/database/key',
      },
      {
        args: {
          notebookId: 'nb1',
          database: {
            key: 'k',
            title: 'T',
            columns: [{ name: 'a', type: 'money' }],
            rows: [],
          },
        },
        path: '/database/columns/0/type',
      },
      {
        args: {
          notebookId: 'nb1',
          database: { key: 'k', title: 'T', columns: [], rows: [] },
        },
        path: '/database/columns',
      },
    ],
  },
}
