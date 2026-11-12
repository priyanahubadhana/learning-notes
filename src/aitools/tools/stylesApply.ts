import type { AiToolDef } from '../types'
import { ID, STYLE, TAB_COLOURS } from './shapes'

export const stylesApply: AiToolDef = {
  id: 'styles.apply',
  version: 1,
  label: 'Apply style',
  group: 'Styles',
  summary: 'Changes the cover colour, view or paper of a notebook or page.',
  aiDescription:
    'Changes the look of an existing notebook: cover colour, shelf or tabs view, path style, paper size and lines. Can set one page tab colour. Needs notebookId. Changes values only; never touches content. Not for writing notes.',
  inputs: {
    type: 'object',
    required: ['notebookId'],
    additionalProperties: false,
    anyOf: [{ required: ['style'] }, { required: ['tabColour'] }],
    properties: {
      notebookId: ID,
      pageId: ID,
      style: STYLE,
      tabColour: { enum: TAB_COLOURS },
      baseRev: { type: 'integer', minimum: 0 },
    },
  },
  outputs: {
    type: 'object',
    properties: { notebookId: { type: 'string' } },
  },
  writes: [{ target: 'style', mode: 'edit' }],
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
      { notebookId: 'nb1', style: { colour: '#2e9e6b', inkBg: 'grid' } },
      { notebookId: 'nb1', pageId: 'p1', tabColour: '#8a5cf6' },
    ],
    bad: [
      { args: { style: { view: 'tabs' } }, path: '/notebookId' },
      { args: { notebookId: 'nb1' }, path: '' },
      {
        args: { notebookId: 'nb1', style: { sheet: 'A5' } },
        path: '/style/sheet',
      },
      { args: { notebookId: 'nb1', tabColour: '#000000' }, path: '/tabColour' },
      {
        args: { notebookId: 'nb1', style: { view: 'tabs' }, baseRev: -1 },
        path: '/baseRev',
      },
    ],
  },
}
