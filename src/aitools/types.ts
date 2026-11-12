/**
 * The AI tool registry format (docs/design/ai-tool-framework.md section 3).
 * Slice 0: definitions only. There is no `stage` function and no executor yet.
 * Everything here is plain data so it can be written to `catalog.gen.json`.
 */

export type JsonScalar = string | number | boolean | null

/**
 * The small JSON Schema subset the validator understands. A schema with no
 * `type` accepts any value. `anyOf` is used only to say "at least one of these
 * fields" (each branch lists `required`).
 */
export interface Schema {
  type?: 'object' | 'array' | 'string' | 'number' | 'integer' | 'boolean'
  description?: string
  enum?: readonly JsonScalar[]
  const?: JsonScalar
  properties?: Readonly<Record<string, Schema>>
  required?: readonly string[]
  additionalProperties?: boolean | Schema
  items?: Schema
  minItems?: number
  maxItems?: number
  minLength?: number
  maxLength?: number
  minimum?: number
  maximum?: number
  /** A regular expression source from our own definitions only. */
  pattern?: string
  anyOf?: readonly Schema[]
}

export type WriteTarget =
  | 'notebook'
  | 'section'
  | 'page'
  | 'blocks'
  | 'tab'
  | 'cards'
  | 'database'
  | 'rows'
  | 'style'
  | 'tags'
  | 'library'
  | 'home'
  | 'review'
  | 'file'
  | 'none'
export type WriteMode = 'create' | 'append' | 'edit' | 'move'
export type Surface = 'app' | 'mcp'

export interface AiToolDef {
  /** Stable name, `group.verb_noun`. Never reused. */
  id: string
  /** Whole number, raised when inputs or behaviour change. */
  version: number
  /** Plain English name (i18n comes with the catalog screen). */
  label: string
  group: string
  summary: string
  /** What the model reads: when to use it, when not to. Under 400 characters. */
  aiDescription: string
  inputs: Schema
  outputs: Schema
  writes: readonly { target: WriteTarget; mode: WriteMode }[]
  permissions: {
    scope: 'notes:read' | 'notes:write'
    proFeature?: string
    respectsLocks: true
    needsSources: boolean
  }
  cost: {
    class: 'none' | 'small' | 'medium' | 'large'
    fill: 'none' | 'model' | 'caller'
    outTokens: number
  }
  tier: 'simple' | 'writing' | 'planning'
  reversible: 'batch' | 'history' | 'values' | 'no'
  risk: 'direct' | 'preview' | 'inbox'
  idempotent: true
  limits: { timeoutMs: number; maxRetries: number }
  surfaces: readonly Surface[]
  offline: boolean
  /** For tests only (left out of the catalog). Paths are inside `args`. */
  examples: {
    good: readonly object[]
    bad: readonly { args: object; path: string }[]
  }
}

/** One tool as the catalog shows it: the definition without its test examples. */
export type CatalogTool = Omit<AiToolDef, 'examples'>
