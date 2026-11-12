import type { AiToolDef } from '../types'
import { BLOCK, BRIEF, ID } from './shapes'

export const pagesRefine: AiToolDef = {
  id: 'pages.refine',
  version: 1,
  label: 'Refine page',
  group: 'Pages',
  summary: 'Improves a page block by block, keeping a History copy.',
  aiDescription:
    'Edits an existing page one block at a time: add, insert after a block, or replace a block. A copy goes to History first. Big changes wait in the Inbox for Accept. Needs pageId. Give ops, or a brief. Never deletes pages.',
  inputs: {
    type: 'object',
    required: ['pageId'],
    additionalProperties: false,
    anyOf: [{ required: ['ops'] }, { required: ['brief'] }],
    properties: {
      pageId: ID,
      brief: BRIEF,
      baseRevision: { type: 'string', minLength: 1, maxLength: 64 },
      ops: {
        type: 'array',
        minItems: 1,
        maxItems: 100,
        items: {
          type: 'object',
          required: ['op', 'block'],
          additionalProperties: false,
          properties: {
            op: { enum: ['add', 'insert', 'replace'] },
            block: BLOCK,
            blockId: ID,
            afterBlockId: ID,
            parentId: ID,
          },
        },
      },
    },
  },
  outputs: {
    type: 'object',
    properties: { pageId: { type: 'string' } },
  },
  writes: [{ target: 'blocks', mode: 'edit' }],
  permissions: {
    scope: 'notes:write',
    respectsLocks: true,
    needsSources: false,
  },
  cost: { class: 'medium', fill: 'model', outTokens: 1500 },
  tier: 'writing',
  reversible: 'history',
  risk: 'preview',
  idempotent: true,
  limits: { timeoutMs: 90000, maxRetries: 3 },
  surfaces: ['app', 'mcp'],
  offline: false,
  examples: {
    good: [
      { pageId: 'p1', brief: 'Tidy the headings' },
      {
        pageId: 'p1',
        ops: [
          {
            op: 'replace',
            blockId: 'b1',
            block: { type: 'paragraph', text: 'Better.' },
          },
        ],
      },
    ],
    bad: [
      { args: { brief: 'x' }, path: '/pageId' },
      { args: { pageId: 'p1', ops: [] }, path: '/ops' },
      {
        args: {
          pageId: 'p1',
          ops: [{ op: 'delete', block: { type: 'paragraph' } }],
        },
        path: '/ops/0/op',
      },
      { args: { pageId: 'p1', ops: [{ op: 'add' }] }, path: '/ops/0/block' },
    ],
  },
}
