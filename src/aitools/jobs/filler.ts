import type { AiToolDef } from '../types'
import type { Rec } from './jobTypes'

/** Why a step failed. Only the first four are worth another try (section 8.5). */
export type ErrorKind =
  | 'network'
  | 'rate_limit'
  | 'server'
  | 'timeout'
  | 'bad_content'
  | 'validation'
  | 'permission'
  | 'lock'
  | 'gone'
  | 'stale'
  | 'budget'
  | 'too_many'

export const RETRYABLE: ReadonlySet<ErrorKind> = new Set([
  'network',
  'rate_limit',
  'server',
  'timeout',
])

/** A step failure with a plain-words line for the person. */
export class StepError extends Error {
  readonly kind: ErrorKind
  /** From a Retry-After header; wins over the normal wait. */
  readonly retryAfterMs?: number
  constructor(kind: ErrorKind, message: string, retryAfterMs?: number) {
    super(message)
    this.name = 'StepError'
    this.kind = kind
    this.retryAfterMs = retryAfterMs
  }
}

export interface FillRequest {
  stepId: string
  tool: AiToolDef
  /** The step arguments after `$from` was resolved. */
  args: Rec
  /** Set on the one repair round: what was wrong with the first answer. */
  repair?: string[]
}

/**
 * Makes the content a step needs (a page, cards, a database, edit ops) as an
 * object merged into the step arguments. Slice 1 has only fakes: the real
 * model filler arrives with slice 4.
 */
export interface Filler {
  fill(req: FillRequest, signal: AbortSignal): Promise<unknown>
}

/** Time, for backoff. Tests use a fake that never really waits. */
export interface Clock {
  now(): number
  sleep(ms: number, signal?: AbortSignal): Promise<void>
}

export const systemClock: Clock = {
  now: () => Date.now(),
  sleep: (ms, signal) =>
    new Promise((resolve) => {
      const t = setTimeout(resolve, ms)
      if (signal)
        signal.onabort = () => {
          clearTimeout(t)
          resolve()
        }
    }),
}
