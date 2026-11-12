import { toCatalog } from '../aitools/catalog'
import type { AiToolDef, CatalogTool } from '../aitools/types'
import { validatePlan } from '../aitools/validate'
import { contentField } from '../aitools/jobs/runner'
import type { FillRequest, Filler } from '../aitools/jobs/filler'
import type { Rec } from '../aitools/jobs/jobTypes'

/**
 * The Build screen's Filler (AF-21): it makes no AI call. It waits for the
 * person to paste an answer that they got by copying the prompt into any
 * chat they like. The answer is checked against the tool's inputs before it
 * is handed on; a wrong one is refused with the reasons, and the step keeps
 * waiting.
 */

export interface PasteRequest {
  stepId: string
  tool: AiToolDef
  args: Rec
  /** The key the answer must carry (`page`, `cards`, ...). */
  field: string
  /** Set when an earlier answer did not fit: what was wrong. */
  repair?: string[]
  /** The text to copy. */
  prompt: string
}

export type SubmitResult = { ok: true } | { ok: false; problems: string[] }

let catalog: readonly CatalogTool[] | null = null

/** Takes the answer text apart: a ```json fence around it is allowed. */
export function parseAnswerText(
  text: string,
): { ok: true; value: Rec } | { ok: false; problem: string } {
  let body = text.trim()
  const fence = /^```[A-Za-z]*\s*\n([\s\S]*?)\n?```\s*$/.exec(body)
  if (fence) body = fence[1].trim()
  if (!body) return { ok: false, problem: 'empty' }
  let value: unknown
  try {
    value = JSON.parse(body)
  } catch {
    return { ok: false, problem: 'json' }
  }
  if (!value || typeof value !== 'object' || Array.isArray(value))
    return { ok: false, problem: 'object' }
  return { ok: true, value: value as Rec }
}

/**
 * Checks a pasted answer for a step. Problems are short English lines from
 * the validator (paths and reasons), shown under a plain heading.
 */
export function checkAnswer(
  tool: AiToolDef | CatalogTool,
  args: Rec,
  text: string,
): { ok: true; value: Rec } | { ok: false; problems: string[] } {
  const parsed = parseAnswerText(text)
  if (!parsed.ok) return { ok: false, problems: [`:${parsed.problem}`] }
  const field = contentField(tool as AiToolDef)
  if (field && parsed.value[field] === undefined)
    return { ok: false, problems: [`:missing ${field}`] }
  catalog ??= toCatalog()
  const found = validatePlan(
    {
      version: 1,
      id: 'check',
      goal: 'check',
      origin: 'app',
      destination: { kind: 'library' },
      steps: [
        {
          id: 's1',
          tool: tool.id,
          toolVersion: tool.version,
          args: { ...args, ...parsed.value },
        },
      ],
    },
    catalog,
  ).map(
    (e) => `${e.path.replace(/^\/steps\/0\/args/, '') || '/'}: ${e.message}`,
  )
  return found.length
    ? { ok: false, problems: found }
    : { ok: true, value: parsed.value }
}

/** The words to copy into a chat: what to make, the shape, and "JSON only". */
export function buildPrompt(
  tool: AiToolDef,
  args: Rec,
  field: string,
  repair?: string[],
): string {
  const brief = typeof args.brief === 'string' ? args.brief : ''
  const count = typeof args.count === 'number' ? args.count : null
  const shape = tool.inputs.properties?.[field]
  const lines = [
    tool.aiDescription,
    brief ? `What to make: ${brief}` : '',
    count ? `How many: ${count}` : '',
    `Answer with ONLY one JSON object, no other words: {"${field}": ...}`,
    `The value of "${field}" must follow this shape:`,
    JSON.stringify(shape ?? {}, null, 2),
    repair?.length
      ? `Your last answer did not fit. Fix these:\n${repair.join('\n')}`
      : '',
  ]
  return lines.filter(Boolean).join('\n\n')
}

interface Waiting {
  req: PasteRequest
  resolve(v: unknown): void
  reject(e: unknown): void
}

export class PasteFiller implements Filler {
  private waiting: Waiting | null = null
  private readonly subs = new Set<() => void>()

  /** What the person is being asked for right now, or null. */
  current(): PasteRequest | null {
    return this.waiting?.req ?? null
  }

  subscribe(cb: () => void): () => void {
    this.subs.add(cb)
    return () => {
      this.subs.delete(cb)
    }
  }

  private emit() {
    for (const f of [...this.subs]) f()
  }

  fill(req: FillRequest, signal: AbortSignal): Promise<unknown> {
    const field = contentField(req.tool) ?? 'content'
    return new Promise((resolve, reject) => {
      if (signal.aborted) return reject(new Error('aborted'))
      const done = () => {
        signal.onabort = null
        this.waiting = null
        this.emit()
      }
      const onAbort = () => {
        done()
        reject(new Error('aborted'))
      }
      signal.onabort = onAbort
      this.waiting = {
        req: {
          stepId: req.stepId,
          tool: req.tool,
          args: req.args,
          field,
          repair: req.repair,
          prompt: buildPrompt(req.tool, req.args, field, req.repair),
        },
        resolve: (v) => {
          done()
          resolve(v)
        },
        reject: (e) => {
          done()
          reject(e)
        },
      }
      this.emit()
    })
  }

  /** Checks the pasted text; only a good one is handed on to the step. */
  submit(text: string): SubmitResult {
    const w = this.waiting
    if (!w) return { ok: false, problems: [':none'] }
    const checked = checkAnswer(w.req.tool, w.req.args, text)
    if (!checked.ok) return checked
    w.resolve(checked.value)
    return { ok: true }
  }

  /** "Not now": the step fails with this error so Retry / Skip / Stop appear. */
  decline(error: unknown): void {
    this.waiting?.reject(error)
  }
}
