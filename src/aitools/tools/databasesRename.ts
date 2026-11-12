import type { AiToolDef } from '../types'
import { ID } from './shapes'

export const databasesRename: AiToolDef = {
  id: 'databases.rename',
  version: 1,
  label: 'Rename database',
  group: 'Databases',
  summary: 'Gives a database a new title.',
  aiDescription:
    'Changes the title of one existing database. Needs databaseId (from an earlier step) and the new title. Changes the title only; never touches columns, rows or views. The Study tracker cannot be renamed.',
  inputs: {
    type: 'object',
    required: ['databaseId', 'title'],
    additionalProperties: false,
    properties: {
      databaseId: ID,
      title: { type: 'string', minLength: 1, maxLength: 200 },
    },
  },
  outputs: {
    type: 'object',
    properties: { databaseId: { type: 'string' } },
  },
  writes: [{ target: 'database', mode: 'edit' }],
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
  surfaces: ['app'],
  offline: true,
  examples: {
    good: [
      { databaseId: 'db1', title: 'Reading list' },
      { databaseId: 'db1', title: 'Books I finished' },
    ],
    bad: [
      { args: { title: 'x' }, path: '/databaseId' },
      { args: { databaseId: 'db1' }, path: '/title' },
      { args: { databaseId: 'db1', title: '' }, path: '/title' },
      { args: { databaseId: 'db1', title: 'x'.repeat(201) }, path: '/title' },
    ],
  },
}
