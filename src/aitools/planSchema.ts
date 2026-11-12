import type { Schema } from './types'

/**
 * The plan document (docs/design/ai-tool-framework.md section 4) as a schema
 * in the same small subset the validator reads. Rules a schema cannot say
 * (kind-specific destination fields, steps that depend on later steps, `$from`
 * targets) are checked in validate.ts.
 */

export const PLAN_VERSION = 1
export const MAX_PLAN_BYTES = 256 * 1024
export const MIN_STEPS = 1
export const MAX_STEPS = 40
export const MAX_DEPTH = 24

export const STEP_ID_PATTERN = '^s\\d+$'
/** `{ "$from": "s1.notebookId" }`: the real output of an earlier step. */
export const FROM_PATTERN = '^s\\d+\\.[A-Za-z][A-Za-z0-9_]*$'
/** `placement.in`: the destination or an earlier step's output. */
export const PLACE_IN_PATTERN =
  '^(\\$destination|s\\d+\\.[A-Za-z][A-Za-z0-9_]*)$'

const ID: Schema = {
  type: 'string',
  minLength: 1,
  maxLength: 64,
  pattern: '^[A-Za-z0-9_-]+$',
}

const STEP: Schema = {
  type: 'object',
  required: ['id', 'tool', 'toolVersion', 'args'],
  additionalProperties: false,
  properties: {
    id: { type: 'string', pattern: STEP_ID_PATTERN, maxLength: 12 },
    tool: { type: 'string', minLength: 1, maxLength: 80 },
    toolVersion: { type: 'integer', minimum: 1 },
    args: { type: 'object' },
    placement: {
      type: 'object',
      additionalProperties: false,
      properties: {
        in: { type: 'string', pattern: PLACE_IN_PATTERN, maxLength: 80 },
        tab: { type: 'string', minLength: 1, maxLength: 60 },
        position: {
          type: 'string',
          pattern: '^(start|end|after:[A-Za-z0-9_-]{1,64})$',
        },
      },
    },
    dependsOn: {
      type: 'array',
      maxItems: MAX_STEPS,
      items: { type: 'string', pattern: STEP_ID_PATTERN, maxLength: 12 },
    },
    optional: { type: 'boolean' },
    enabled: { type: 'boolean' },
  },
}

export const PLAN_SCHEMA: Schema = {
  type: 'object',
  required: ['version', 'id', 'goal', 'origin', 'destination', 'steps'],
  additionalProperties: false,
  properties: {
    version: { const: PLAN_VERSION },
    id: {
      type: 'string',
      minLength: 1,
      maxLength: 64,
      pattern: '^[A-Za-z0-9_.-]+$',
    },
    goal: { type: 'string', minLength: 1, maxLength: 2000 },
    origin: { enum: ['app', 'mcp'] },
    destination: {
      type: 'object',
      required: ['kind'],
      additionalProperties: false,
      properties: {
        kind: { enum: ['new_notebook', 'notebook', 'page', 'library'] },
        title: { type: 'string', minLength: 1, maxLength: 120 },
        id: ID,
        sectionId: ID,
      },
    },
    sources: { type: 'array', maxItems: 100, items: ID },
    effort: { enum: ['quick', 'standard', 'deep'] },
    steps: {
      type: 'array',
      minItems: MIN_STEPS,
      maxItems: MAX_STEPS,
      items: STEP,
    },
    budget: {
      type: 'object',
      additionalProperties: false,
      properties: { maxInr: { type: 'number', minimum: 0, maximum: 1000000 } },
    },
  },
}

/** What each destination kind must carry (a schema cannot say "if kind is …"). */
export const DESTINATION_REQUIRES: Readonly<Record<string, readonly string[]>> =
  {
    new_notebook: ['title'],
    notebook: ['id'],
    page: ['id'],
    library: [],
  }
