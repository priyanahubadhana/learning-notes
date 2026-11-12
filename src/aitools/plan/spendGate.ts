/**
 * `spendGate`: the ONLY door to a paid model call (docs/design/
 * ai-tool-framework.md section 9). The owner's spend limit is ₹0, so with the
 * default settings every paid call is refused. Free engines (the copy-prompt /
 * paste-answer path and Claude through the connector) cost nothing and never
 * need the gate. Money here is in rupees.
 *
 * Pure: the settings and the ledger are given in, so tests use a fake ledger
 * and the app uses the small local-preferences one in `spendStore.ts`.
 */

export interface SpendSettings {
  /** Monthly hard stop. 0 (the default) means no paid call, ever. */
  monthlyInr: number
  /** One job may not cost more than this (0 = no extra per-job limit). */
  perJobInr: number
  /** Ask first when a job is estimated above this (0 = ask for every paid job). */
  askAboveInr: number
}

/** The owner's current limit: ₹0, nothing paid. */
export const DEFAULT_SPEND_SETTINGS: SpendSettings = {
  monthlyInr: 0,
  perJobInr: 0,
  askAboveInr: 0,
}

export interface LedgerState {
  /** "YYYY-MM" of the local calendar. */
  month: string
  spentInr: number
  /** Estimates held for jobs that have started and not finished. */
  reserved: Record<string, number>
}

export interface SpendLedger {
  read(): LedgerState | null
  write(state: LedgerState): void
}

export class MemoryLedger implements SpendLedger {
  private state: LedgerState | null = null
  read() {
    return this.state ? structuredClone(this.state) : null
  }
  write(state: LedgerState) {
    this.state = structuredClone(state)
  }
}

export type Refusal = 'zero_limit' | 'monthly' | 'per_job' | 'ask'

export type GateResult =
  | { ok: true; free: boolean; reservedInr: number }
  | { ok: false; reason: Refusal; needInr: number; limitInr: number }

/** Thrown by `guardedPaidCall` when the gate says no. The call never starts. */
export class SpendRefused extends Error {
  readonly reason: Refusal
  constructor(reason: Refusal) {
    super(`Spend refused: ${reason}`)
    this.name = 'SpendRefused'
    this.reason = reason
  }
}

export type Meter = 'ok' | 'pause' | 'blocked'

/** The job pauses and asks when real spend passes the approved estimate by more than this. */
export const OVERRUN = 0.2

const monthKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`

const num = (n: unknown): number =>
  typeof n === 'number' && Number.isFinite(n) && n > 0 ? n : 0

export class SpendGate {
  private readonly settings: () => SpendSettings
  private readonly ledger: SpendLedger
  private readonly now: () => Date
  constructor(opts: {
    settings?: () => SpendSettings
    ledger: SpendLedger
    now?: () => Date
  }) {
    this.settings = opts.settings ?? (() => DEFAULT_SPEND_SETTINGS)
    this.ledger = opts.ledger
    this.now = opts.now ?? (() => new Date())
  }

  private state(): LedgerState {
    const month = monthKey(this.now())
    const saved = this.ledger.read()
    // A new month starts clean: spend resets, nothing is carried over.
    return saved && saved.month === month
      ? saved
      : { month, spentInr: 0, reserved: {} }
  }

  private limits(): SpendSettings {
    const s = this.settings()
    return {
      monthlyInr: num(s.monthlyInr),
      perJobInr: num(s.perJobInr),
      askAboveInr: num(s.askAboveInr),
    }
  }

  /** What this month already holds: spent plus the reservations of other jobs. */
  private used(state: LedgerState, jobId: string): number {
    let held = state.spentInr
    for (const [id, v] of Object.entries(state.reserved))
      if (id !== jobId) held += v
    return held
  }

  /**
   * May this job start? Checks, in order: monthly limit (₹0 = hard stop),
   * per-job limit, "ask me above ₹X". An estimate that is not a clean number
   * is refused (fail closed). A free job (estimate 0) always passes and
   * reserves nothing. A pass reserves the estimate for the month.
   */
  check(
    jobId: string,
    estimateInr: number,
    opts: { approved?: boolean } = {},
  ): GateResult {
    if (estimateInr === 0) return { ok: true, free: true, reservedInr: 0 }
    const limits = this.limits()
    const bad = !Number.isFinite(estimateInr) || estimateInr < 0
    const need = bad ? Number.POSITIVE_INFINITY : estimateInr
    if (limits.monthlyInr <= 0)
      return { ok: false, reason: 'zero_limit', needInr: need, limitInr: 0 }
    const state = this.state()
    const room = limits.monthlyInr - this.used(state, jobId)
    if (bad || need > room)
      return {
        ok: false,
        reason: 'monthly',
        needInr: need,
        limitInr: Math.max(room, 0),
      }
    if (limits.perJobInr > 0 && need > limits.perJobInr)
      return {
        ok: false,
        reason: 'per_job',
        needInr: need,
        limitInr: limits.perJobInr,
      }
    if (need > limits.askAboveInr && !opts.approved)
      return {
        ok: false,
        reason: 'ask',
        needInr: need,
        limitInr: limits.askAboveInr,
      }
    state.reserved[jobId] = need
    this.ledger.write(state)
    return { ok: true, free: false, reservedInr: need }
  }

  /**
   * Called around each paid call with what the job has really spent so far
   * and what the next call may cost. 'blocked': the call would cross the hard
   * limit (or the job never passed `check`), so it is not sent. 'pause': it
   * would pass the approved estimate by more than 20%, so the job asks first.
   */
  meter(jobId: string, spentSoFarInr: number, nextCallInr = 0): Meter {
    const state = this.state()
    const limits = this.limits()
    const reserved = state.reserved[jobId]
    if (reserved === undefined || limits.monthlyInr <= 0) return 'blocked'
    const total = num(spentSoFarInr) + num(nextCallInr)
    if (
      !Number.isFinite(nextCallInr) ||
      this.used(state, jobId) + total > limits.monthlyInr
    )
      return 'blocked'
    return total > reserved * (1 + OVERRUN) ? 'pause' : 'ok'
  }

  /** The job finished: its reservation becomes the real spend. */
  settle(jobId: string, realInr: number): void {
    const state = this.state()
    delete state.reserved[jobId]
    state.spentInr += num(realInr)
    this.ledger.write(state)
  }

  /** The job ended without spending: give the reservation back. */
  release(jobId: string): void {
    const state = this.state()
    if (!(jobId in state.reserved)) return
    delete state.reserved[jobId]
    this.ledger.write(state)
  }

  /** For the screen: what is left this month (never below 0). */
  remainingInr(): number {
    const state = this.state()
    return Math.max(this.limits().monthlyInr - this.used(state, ''), 0)
  }
}

/**
 * The only way code starts a paid call: ask the gate, run, meter, settle.
 * The call is not even created when the gate refuses.
 */
export async function guardedPaidCall<T extends { costInr: number }>(
  gate: SpendGate,
  jobId: string,
  estimateInr: number,
  call: () => Promise<T>,
  opts: { approved?: boolean } = {},
): Promise<T> {
  // A paid call always has a real, positive estimate; "free" is not a way in.
  if (!(Number.isFinite(estimateInr) && estimateInr > 0))
    throw new SpendRefused('monthly')
  const decision = gate.check(jobId, estimateInr, opts)
  if (!decision.ok) throw new SpendRefused(decision.reason)
  if (gate.meter(jobId, 0, estimateInr) === 'blocked') {
    gate.release(jobId)
    throw new SpendRefused('monthly')
  }
  let real = 0
  try {
    const out = await call()
    real = num(out.costInr)
    return out
  } finally {
    gate.settle(jobId, real)
  }
}
