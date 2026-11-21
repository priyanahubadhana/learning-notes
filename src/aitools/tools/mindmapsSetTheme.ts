import type { AiToolDef } from '../types'
import { ID } from './shapes'

export const mindmapsSetTheme: AiToolDef = {
  id: 'mindmaps.set_theme',
  version: 1,
  label: 'Change mind map colours',
  group: 'Mind maps',
  summary: 'Changes the colour theme of a mind map.',
  aiDescription:
    'Sets the colour theme of one existing mind map block: calm, bold or paper. Needs blockId (the mind map block). Changes only the theme, never the topics. Not for adding a map.',
  inputs: {
    type: 'object',
    required: ['blockId', 'theme'],
    additionalProperties: false,
    properties: {
      blockId: ID,
      theme: { enum: ['calm', 'bold', 'paper'] },
    },
  },
  outputs: {
    type: 'object',
    properties: { blockId: { type: 'string' } },
  },
  writes: [{ target: 'blocks', mode: 'edit' }],
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
      { blockId: 'mb1', theme: 'bold' },
      { blockId: 'mb1', theme: 'paper' },
    ],
    bad: [
      { args: { theme: 'bold' }, path: '/blockId' },
      { args: { blockId: 'mb1' }, path: '/theme' },
      { args: { blockId: 'mb1', theme: 'neon' }, path: '/theme' },
    ],
  },
}
