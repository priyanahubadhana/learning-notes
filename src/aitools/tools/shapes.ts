import type { Schema } from '../types'

/**
 * Content shapes shared by the tools. They are simplified copies of the
 * `$defs` slice 0 will later add to src/connector/spec.schema.json (this
 * folder must not import from src/connector). Differences: blocks nest two
 * levels (the spec allows three), database cell values accept any JSON.
 */

export const ID: Schema = {
  type: 'string',
  minLength: 1,
  maxLength: 64,
  pattern: '^[A-Za-z0-9_-]+$',
}

export const BRIEF: Schema = { type: 'string', minLength: 1, maxLength: 2000 }

export const TAB_COLOURS = [
  '#2f6feb',
  '#2e9e6b',
  '#d9822b',
  '#c8402f',
  '#8a5cf6',
  '#c2417f',
] as const

export const STYLE: Schema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    colour: { type: 'string', pattern: '^#[0-9a-fA-F]{6}$' },
    view: { enum: ['shelf', 'tabs'] },
    pathStyle: { enum: ['simple', 'full', 'page'] },
    sheet: { enum: ['A4', 'Letter'] },
    inkBg: { enum: ['lined', 'grid', 'dots'] },
  },
}

const BLOCK_TYPES = [
  'paragraph',
  'heading',
  'bulletListItem',
  'numberedListItem',
  'checkListItem',
  'quote',
  'divider',
  'codeBlock',
  'table',
  'toggleListItem',
  'callout',
  'card',
  'mindMap',
  'math',
  'embed',
  'pageLink',
  'database',
] as const

const blockProps: Record<string, Schema> = {
  type: { enum: BLOCK_TYPES },
  text: { type: 'string', maxLength: 20000 },
  level: { enum: [1, 2, 3] },
  checked: { type: 'boolean' },
  language: { type: 'string', maxLength: 30, pattern: '^[A-Za-z0-9+#._-]*$' },
  emoji: { type: 'string', minLength: 1, maxLength: 16 },
  rows: {
    type: 'array',
    minItems: 1,
    maxItems: 50,
    items: {
      type: 'array',
      minItems: 1,
      maxItems: 12,
      items: { type: 'string', maxLength: 5000 },
    },
  },
  outline: { type: 'string', minLength: 1, maxLength: 5000 },
  latex: { type: 'string', minLength: 1, maxLength: 5000 },
  url: {
    type: 'string',
    minLength: 1,
    maxLength: 2000,
    pattern: '^https://\\S+$',
  },
  caption: { type: 'string', maxLength: 500 },
  page: { type: 'string', minLength: 1, maxLength: 120 },
  database: { type: 'string', minLength: 1, maxLength: 40 },
}

const LEAF_BLOCK: Schema = {
  type: 'object',
  required: ['type'],
  additionalProperties: false,
  properties: blockProps,
}

export const BLOCK: Schema = {
  type: 'object',
  required: ['type'],
  additionalProperties: false,
  properties: {
    ...blockProps,
    children: { type: 'array', maxItems: 50, items: LEAF_BLOCK },
  },
}

export const PAGE: Schema = {
  type: 'object',
  required: ['title', 'blocks'],
  additionalProperties: false,
  properties: {
    title: { type: 'string', minLength: 1, maxLength: 120 },
    summary: { type: 'string', maxLength: 2000 },
    tabColour: { enum: TAB_COLOURS },
    blocks: { type: 'array', maxItems: 200, items: BLOCK },
  },
}

export const QA_CARD: Schema = {
  type: 'object',
  required: ['kind', 'q', 'a'],
  additionalProperties: false,
  properties: {
    kind: { const: 'qa' },
    q: { type: 'string', minLength: 1, maxLength: 5000 },
    a: { type: 'string', minLength: 1, maxLength: 5000 },
    page: { type: 'string', minLength: 1, maxLength: 120 },
  },
}

export const CLOZE_CARD: Schema = {
  type: 'object',
  required: ['kind', 'text'],
  additionalProperties: false,
  properties: {
    kind: { const: 'cloze' },
    text: {
      type: 'string',
      minLength: 1,
      maxLength: 5000,
      pattern: '\\{\\{[^{}]+\\}\\}',
    },
    page: { type: 'string', minLength: 1, maxLength: 120 },
  },
}

export const DATABASE: Schema = {
  type: 'object',
  required: ['key', 'title', 'columns', 'rows'],
  additionalProperties: false,
  properties: {
    key: { type: 'string', pattern: '^[a-z0-9_-]{1,40}$' },
    title: { type: 'string', minLength: 1, maxLength: 120 },
    columns: {
      type: 'array',
      minItems: 1,
      maxItems: 30,
      items: {
        type: 'object',
        required: ['name', 'type'],
        additionalProperties: false,
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 60 },
          type: {
            enum: [
              'text',
              'number',
              'date',
              'checkbox',
              'choice',
              'choices',
              'url',
            ],
          },
          options: {
            type: 'array',
            minItems: 1,
            maxItems: 50,
            items: { type: 'string', minLength: 1, maxLength: 60 },
          },
        },
      },
    },
    rows: {
      type: 'array',
      maxItems: 1000,
      items: {
        type: 'object',
        required: ['title'],
        additionalProperties: false,
        properties: {
          title: { type: 'string', minLength: 1, maxLength: 120 },
          values: { type: 'object', additionalProperties: true },
        },
      },
    },
  },
}
