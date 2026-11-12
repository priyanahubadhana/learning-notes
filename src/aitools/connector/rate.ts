import type { JobPlan } from '../jobs/jobTypes'

/**
 * Connector limits (design section 11.4). Reads 60 a minute; writes 20 a
 * minute and 500 a day. One `run_plan` counts as one write plus one per
 * enabled step, checked before anything runs, so a plan is refused whole.
 * `undo_job` counts one. Pure: the clock is passed in, so the online function
 * can share the same rule.
 */
export const READS_PER_MINUTE = 60
export const WRITES_PER_MINUTE = 20
export const WRITES_PER_DAY = 500

const MINUTE = 60_000
const DAY = 86_400_000

/** What a plan costs against the write limit: 1 + its enabled steps. */
export function writeCost(plan: Pick<JobPlan, 'steps'>): number {
  const steps = Array.isArray(plan.steps) ? plan.steps : []
  return 1 + steps.filter((s) => s && s.enabled !== false).length
}

export class RateLimitError extends Error {
  readonly retryAfterSec: number
  constructor(message: string, retryAfterSec: number) {
    super(message)
    this.name = 'RateLimitError'
    this.retryAfterSec = retryAfterSec
  }
}

export class RateLimiter {
  private readonly now: () => number
  private reads: number[] = []
  /** One entry per counted unit. */
  private writes: number[] = []
  constructor(now: () => number = Date.now) {
    this.now = now
  }

  /** Counts one read, or refuses it. */
  read(): void {
    const t = this.now()
    this.reads = this.reads.filter((x) => t - x < MINUTE)
    if (this.reads.length >= READS_PER_MINUTE)
      throw this.refuse(MINUTE - (t - this.reads[0]))
    this.reads.push(t)
  }

  /** Counts `cost` writes together, or refuses all of them (nothing is counted). */
  write(cost: number): void {
    const t = this.now()
    this.writes = this.writes.filter((x) => t - x < DAY)
    const lastMinute = this.writes.filter((x) => t - x < MINUTE)
    if (cost > WRITES_PER_MINUTE)
      throw new RateLimitError(
        `This plan counts ${cost} against the limit of ${WRITES_PER_MINUTE} a minute (one for the plan and one for each step). Split it into plans of at most ${WRITES_PER_MINUTE - 1} steps.`,
        0,
      )
    if (lastMinute.length + cost > WRITES_PER_MINUTE) {
      const need = lastMinute.length + cost - WRITES_PER_MINUTE
      const free = lastMinute.sort((a, b) => a - b)[need - 1]
      throw this.refuse(MINUTE - (t - free))
    }
    if (this.writes.length + cost > WRITES_PER_DAY) {
      const need = this.writes.length + cost - WRITES_PER_DAY
      const free = this.writes.sort((a, b) => a - b)[need - 1]
      throw this.refuse(DAY - (t - free))
    }
    for (let i = 0; i < cost; i++) this.writes.push(t)
  }

  private refuse(ms: number): RateLimitError {
    const sec = Math.max(1, Math.ceil(ms / 1000))
    return new RateLimitError(
      `Too many requests for now. Nothing was changed. Try again in ${sec} seconds.`,
      sec,
    )
  }
}
