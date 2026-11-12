import {
  DESTINATION_REQUIRES,
  FROM_PATTERN,
  MAX_DEPTH,
  MAX_PLAN_BYTES,
  PLACE_IN_PATTERN,
  PLAN_SCHEMA,
} from './planSchema'
import type { CatalogTool, Schema } from './types'

/**
 * validatePlan(plan, catalog, ctx) -> errors (design section 6, levels 1 to 4
 * and the safety checks). An empty list means valid.
 *
 * The plan is untrusted. This file never uses eval or `new Function`, reads
 * only own keys (`Object.hasOwn`), caps size, depth and node count before it
 * looks at meaning, and never throws: the outer try/catch is the last resort,
 * the code below is also written to be correct without it.
 */

export interface PlanError {
  path: string
  message: string
}

export interface ValidateContext {
  /** Where the plan will run. Default 'app'. */
  surface?: 'app' | 'mcp'
}

const MAX_ERRORS = 100
const MAX_NODES = 20000
const MAX_ARRAY = 100000
const HOSTILE_KEYS = new Set(['__proto__', 'constructor', 'prototype'])

const own = (o: object, key: string): boolean => Object.hasOwn(o, key)
const isPlain = (v: unknown): v is Record<string, unknown> => {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) return false
  const proto = Object.getPrototypeOf(v)
  return proto === Object.prototype || proto === null
}
const esc = (key: string): string =>
  key.replace(/~/g, '~0').replace(/\//g, '~1')
/** A tool or step name as safe text for a message (never echo raw input). */
const safe = (v: unknown): string =>
  typeof v === 'string' ? v.slice(0, 60).replace(/[^A-Za-z0-9._-]/g, '?') : '?'

const regexCache = new Map<string, RegExp | null>()
function regexOf(source: string): RegExp | null {
  if (regexCache.has(source)) return regexCache.get(source) ?? null
  let re: RegExp | null
  try {
    re = new RegExp(source)
  } catch {
    re = null
  }
  regexCache.set(source, re)
  return re
}

interface Ref {
  path: string
  from: string
  /** The type the receiving field wants, if its schema says. */
  want?: Schema['type']
}

interface Sink {
  errors: PlanError[]
  refs: Ref[]
}

function fail(sink: Sink, path: string, message: string): void {
  if (sink.errors.length < MAX_ERRORS) sink.errors.push({ path, message })
}

// ---------------------------------------------------------------- scanning

interface Scan {
  nodes: number
  chars: number
  stop: boolean
}

/** Cheap structural pass: depth, size, JSON-only values, hostile keys. */
function scan(
  value: unknown,
  path: string,
  depth: number,
  s: Scan,
  sink: Sink,
) {
  if (s.stop) return
  if (++s.nodes > MAX_NODES) {
    s.stop = true
    fail(sink, '', 'The plan has too many parts.')
    return
  }
  if (depth > MAX_DEPTH) {
    s.stop = true
    fail(sink, path, 'This is nested too deeply.')
    return
  }
  switch (typeof value) {
    case 'string':
      s.chars += value.length
      break
    case 'number':
      if (!Number.isFinite(value))
        fail(sink, path, 'This number is not allowed.')
      break
    case 'boolean':
      break
    case 'object': {
      if (value === null) break
      if (Array.isArray(value)) {
        if (value.length > MAX_ARRAY) {
          s.stop = true
          fail(sink, path, 'This list is too long.')
          return
        }
        for (let i = 0; i < value.length; i++)
          scan(value[i], `${path}/${i}`, depth + 1, s, sink)
        return
      }
      if (!isPlain(value)) {
        fail(sink, path, 'This is not plain JSON.')
        return
      }
      for (const key of Object.keys(value)) {
        s.chars += key.length
        if (HOSTILE_KEYS.has(key))
          fail(sink, `${path}/${esc(key)}`, 'This name is not allowed.')
        scan(value[key], `${path}/${esc(key)}`, depth + 1, s, sink)
        if (s.stop) return
      }
      break
    }
    default:
      fail(sink, path, 'This is not plain JSON.')
  }
  if (s.chars > MAX_PLAN_BYTES) {
    s.stop = true
    fail(sink, '', 'The plan is bigger than 256 KB.')
  }
}

// ------------------------------------------------------- schema subset check

const typeMatches = (type: Schema['type'], v: unknown): boolean => {
  switch (type) {
    case 'object':
      return isPlain(v)
    case 'array':
      return Array.isArray(v)
    case 'string':
      return typeof v === 'string'
    case 'boolean':
      return typeof v === 'boolean'
    case 'number':
      return typeof v === 'number' && Number.isFinite(v)
    case 'integer':
      return typeof v === 'number' && Number.isInteger(v)
    default:
      return true
  }
}

const NAMES = {
  object: 'an object',
  array: 'a list',
  string: 'text',
  number: 'a number',
  integer: 'a whole number',
  boolean: 'true or false',
} as const
const describe = (type: NonNullable<Schema['type']>): string => NAMES[type]

/** True if `value` is a `{ "$from": "sN.field" }` reference (or a broken one). */
function checkRef(
  value: unknown,
  path: string,
  want: Schema['type'],
  sink: Sink,
) {
  if (!isPlain(value) || !own(value, '$from')) return false
  const from = value['$from']
  if (
    Object.keys(value).length !== 1 ||
    typeof from !== 'string' ||
    !(regexOf(FROM_PATTERN)?.test(from) ?? false)
  ) {
    fail(
      sink,
      path,
      'A reference must look like { "$from": "s1.pageId" } and have nothing else.',
    )
  } else {
    sink.refs.push({ path, from, want })
  }
  return true
}

function checkValue(
  value: unknown,
  schema: Schema,
  path: string,
  sink: Sink,
): void {
  // A reference stands for the real output of an earlier step: any type fits.
  if (checkRef(value, path, schema.type, sink)) return

  if (schema.type && !typeMatches(schema.type, value)) {
    fail(sink, path, `This must be ${describe(schema.type)}.`)
    return
  }
  if (schema.const !== undefined && value !== schema.const) {
    fail(sink, path, `This must be ${JSON.stringify(schema.const)}.`)
    return
  }
  if (schema.enum && !schema.enum.includes(value as never)) {
    fail(
      sink,
      path,
      `This must be one of: ${schema.enum.map((e) => JSON.stringify(e)).join(', ')}.`,
    )
    return
  }

  if (typeof value === 'string') {
    if (schema.minLength !== undefined && value.length < schema.minLength)
      fail(
        sink,
        path,
        schema.minLength === 1
          ? 'This cannot be empty.'
          : `This must have at least ${schema.minLength} characters.`,
      )
    if (schema.maxLength !== undefined && value.length > schema.maxLength)
      fail(sink, path, `This must have at most ${schema.maxLength} characters.`)
    if (schema.pattern !== undefined) {
      const re = regexOf(schema.pattern)
      if (!re || !re.test(value))
        fail(sink, path, 'This is not in the expected format.')
    }
  } else if (typeof value === 'number') {
    if (schema.minimum !== undefined && value < schema.minimum)
      fail(sink, path, `This must be at least ${schema.minimum}.`)
    if (schema.maximum !== undefined && value > schema.maximum)
      fail(sink, path, `This must be at most ${schema.maximum}.`)
  } else if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems)
      fail(
        sink,
        path,
        `This needs at least ${schema.minItems} item${schema.minItems === 1 ? '' : 's'}.`,
      )
    if (schema.maxItems !== undefined && value.length > schema.maxItems)
      fail(sink, path, `This can have at most ${schema.maxItems} items.`)
    const items = schema.items
    if (items) {
      for (let i = 0; i < value.length && sink.errors.length < MAX_ERRORS; i++)
        checkValue(value[i], items, `${path}/${i}`, sink)
    }
  } else if (isPlain(value)) {
    const props = schema.properties ?? {}
    for (const key of schema.required ?? []) {
      if (!own(value, key))
        fail(sink, `${path}/${esc(key)}`, 'This is required.')
    }
    for (const key of Object.keys(value)) {
      const sub = own(props, key) ? props[key] : undefined
      if (sub) checkValue(value[key], sub, `${path}/${esc(key)}`, sink)
      else if (schema.additionalProperties === false)
        fail(sink, `${path}/${esc(key)}`, 'This field is not allowed here.')
      else if (isPlainSchema(schema.additionalProperties))
        checkValue(
          value[key],
          schema.additionalProperties,
          `${path}/${esc(key)}`,
          sink,
        )
    }
  }

  if (schema.anyOf && isPlain(value)) {
    const ok = schema.anyOf.some((branch) => {
      const probe: Sink = { errors: [], refs: [] }
      checkValue(value, branch, path, probe)
      return probe.errors.length === 0
    })
    if (!ok) {
      const names = schema.anyOf.flatMap((b) => b.required ?? [])
      fail(sink, path, `Give at least one of: ${names.join(', ')}.`)
    }
  }
}

const isPlainSchema = (v: boolean | Schema | undefined): v is Schema =>
  typeof v === 'object' && v !== null

// -------------------------------------------------------------- plan checks

function run(
  plan: unknown,
  catalog: readonly CatalogTool[],
  ctx: ValidateContext,
): PlanError[] {
  const sink: Sink = { errors: [], refs: [] }

  // Level 0 (safety): size, depth, JSON-only, hostile keys. Stops early.
  const s: Scan = { nodes: 0, chars: 0, stop: false }
  scan(plan, '', 0, s, sink)
  if (sink.errors.length) return sink.errors
  let bytes: number
  try {
    const json = JSON.stringify(plan)
    bytes = json === undefined ? 0 : new TextEncoder().encode(json).length
  } catch {
    return [{ path: '', message: 'The plan could not be read.' }]
  }
  if (bytes > MAX_PLAN_BYTES)
    return [{ path: '', message: 'The plan is bigger than 256 KB.' }]

  // Level 1: shape.
  checkValue(plan, PLAN_SCHEMA, '', sink)
  if (!isPlain(plan)) return sink.errors

  const dest = plan['destination']
  if (
    isPlain(dest) &&
    typeof dest['kind'] === 'string' &&
    own(DESTINATION_REQUIRES, dest['kind'])
  ) {
    for (const key of DESTINATION_REQUIRES[dest['kind']]) {
      if (!own(dest, key))
        fail(
          sink,
          `/destination/${key}`,
          `A destination of kind "${safe(dest['kind'])}" needs "${key}".`,
        )
    }
  }

  const steps = plan['steps']
  if (!Array.isArray(steps)) return sink.errors

  const tools = new Map<string, CatalogTool>()
  for (const tool of catalog) {
    if (isPlain(tool) && typeof tool.id === 'string' && !tools.has(tool.id))
      tools.set(tool.id, tool)
  }
  const surface = ctx.surface ?? 'app'

  // Step ids and positions.
  const index = new Map<string, number>()
  steps.forEach((step, i) => {
    if (!isPlain(step) || typeof step['id'] !== 'string') return
    if (index.has(step['id']))
      fail(
        sink,
        `/steps/${i}/id`,
        `The step id ${safe(step['id'])} is used twice.`,
      )
    else index.set(step['id'], i)
  })

  const toolOf = (i: number): CatalogTool | undefined => {
    const step = steps[i]
    return isPlain(step) && typeof step['tool'] === 'string'
      ? tools.get(step['tool'])
      : undefined
  }
  const edges: number[][] = steps.map(() => [])

  // A reference to `sN.field`: must be an earlier step with that output.
  const resolve = (
    from: string,
    at: number,
    path: string,
    want?: Schema['type'],
  ) => {
    const [sid, field] = from.split('.')
    const j = index.get(sid)
    if (j === undefined)
      return fail(sink, path, `There is no step ${safe(sid)}.`)
    edges[at].push(j)
    if (j >= at)
      return fail(
        sink,
        path,
        'This needs the output of an earlier step, not this one or a later one.',
      )
    const target = steps[j]
    const me = steps[at]
    if (
      isPlain(target) &&
      target['enabled'] === false &&
      isPlain(me) &&
      me['enabled'] !== false
    )
      fail(
        sink,
        path,
        `Step ${safe(sid)} is switched off, so its output is not available.`,
      )
    const def = toolOf(j)
    if (!def) return
    const outs = def.outputs.properties
    if (!outs || !own(outs, field)) {
      return fail(
        sink,
        path,
        `Step ${safe(sid)} (${def.id}) has no output called ${safe(field)}.`,
      )
    }
    const got = outs[field].type
    const same =
      got === want ||
      (got === 'integer' && want === 'number') ||
      (got === 'number' && want === 'integer')
    if (got && want && !same)
      fail(
        sink,
        path,
        `Step ${safe(sid)} gives ${describe(got)} here, but ${describe(want)} is needed.`,
      )
  }

  steps.forEach((step, i) => {
    if (!isPlain(step)) return
    const base = `/steps/${i}`
    const def = toolOf(i)

    // Level 2: registry.
    if (typeof step['tool'] === 'string') {
      if (!def) {
        fail(
          sink,
          `${base}/tool`,
          `Unknown tool "${safe(step['tool'])}". Use only tools from the catalog.`,
        )
      } else {
        if (
          typeof step['toolVersion'] === 'number' &&
          step['toolVersion'] !== def.version
        )
          fail(
            sink,
            `${base}/toolVersion`,
            `${def.id} is at version ${def.version}, not ${safe(String(step['toolVersion']))}.`,
          )
        const offered = Array.isArray(def.surfaces)
          ? def.surfaces
          : ['app', 'mcp']
        if (!offered.includes(surface))
          fail(sink, `${base}/tool`, `${def.id} is not offered on ${surface}.`)
      }
    }

    // Level 3: arguments. References are collected, then resolved (level 4).
    if (isPlain(step['args']) && own(step['args'], '$from'))
      fail(
        sink,
        `${base}/args`,
        'The arguments cannot be a reference; put the reference in a field.',
      )
    else if (def && isPlain(step['args'])) {
      const probe: Sink = { errors: sink.errors, refs: [] }
      checkValue(step['args'], def.inputs, `${base}/args`, probe)
      for (const ref of probe.refs) resolve(ref.from, i, ref.path, ref.want)
    }

    // Level 4: graph.
    const place = step['placement']
    if (
      isPlain(place) &&
      typeof place['in'] === 'string' &&
      place['in'] !== '$destination'
    ) {
      if (regexOf(PLACE_IN_PATTERN)?.test(place['in']))
        resolve(place['in'], i, `${base}/placement/in`)
    }
    const deps = step['dependsOn']
    if (Array.isArray(deps)) {
      deps.forEach((dep, k) => {
        if (typeof dep !== 'string') return
        const j = index.get(dep)
        const path = `${base}/dependsOn/${k}`
        if (j === undefined)
          return fail(sink, path, `There is no step ${safe(dep)}.`)
        edges[i].push(j)
        if (j >= i)
          fail(sink, path, 'A step can only depend on an earlier step.')
      })
    }
  })

  // Cycles (depth-first; at most 40 steps, so recursion is shallow).
  const state = new Array<number>(steps.length).fill(0)
  let cyclic = -1
  const visit = (n: number): void => {
    if (cyclic >= 0) return
    state[n] = 1
    for (const m of edges[n]) {
      if (state[m] === 1) {
        cyclic = n
        return
      }
      if (state[m] === 0) visit(m)
      if (cyclic >= 0) return
    }
    state[n] = 2
  }
  for (let n = 0; n < steps.length && cyclic < 0; n++)
    if (state[n] === 0) visit(n)
  if (cyclic >= 0)
    fail(
      sink,
      `/steps/${cyclic}/dependsOn`,
      'Steps depend on each other in a circle.',
    )

  return sink.errors
}

/** Checks a plan. Returns `[]` when it is valid. Never throws. */
export function validatePlan(
  plan: unknown,
  catalog: readonly CatalogTool[],
  ctx: ValidateContext = {},
): PlanError[] {
  try {
    return run(plan, catalog, ctx)
  } catch {
    return [{ path: '', message: 'The plan could not be checked.' }]
  }
}
