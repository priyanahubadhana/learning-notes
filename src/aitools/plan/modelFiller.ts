import { StepError, type FillRequest, type Filler } from '../jobs/filler'
import { contentField } from '../jobs/runner'
import {
  estimateOutTokens,
  inrFor,
  DEFAULT_USD_TO_INR,
  PROMPT_OVERHEAD_TOKENS,
  textTokens,
} from './cost'
import type { PaidEngine } from './router'
import {
  OVERRUN,
  SpendRefused,
  guardedPaidCall,
  type Refusal,
  type SpendGate,
} from './spendGate'

/**
 * A filler that asks a paid model for a step's content. It is only an
 * interface here: the app never wires a real caller in (the spend limit is
 * ₹0), and tests pass fakes. Every call goes through `guardedPaidCall`, so
 * a refused call is never started.
 */

export interface ModelAnswer {
  text: string
  inTokens: number
  outTokens: number
  costInr: number
}

export interface ModelCaller {
  engine: PaidEngine
  call(prompt: string, signal: AbortSignal): Promise<ModelAnswer>
}

const REFUSALS: Record<Refusal | 'pause', string> = {
  zero_limit: 'The spend limit is ₹0, so no paid model was used.',
  monthly: 'This would pass the monthly spend limit, so it was not sent.',
  per_job: 'This job would cost more than the limit for one job.',
  ask: 'This costs money and needs your OK first.',
  pause: 'The cost passed the estimate, so the job paused.',
}

/** A refusal in plain English (the Build screen shows it in the person's language). */
export const refusalText = (r: Refusal | 'pause'): string => REFUSALS[r]

export function fillPrompt(req: FillRequest): string {
  const field = contentField(req.tool) ?? 'content'
  const brief = typeof req.args.brief === 'string' ? req.args.brief : ''
  return [
    req.tool.aiDescription,
    brief ? `What to make: ${brief}` : '',
    `Answer with ONLY one JSON object: {"${field}": ...}`,
    JSON.stringify(req.tool.inputs.properties?.[field] ?? {}),
    req.repair?.length
      ? `Your last answer did not fit:\n${req.repair.join('\n')}`
      : '',
  ]
    .filter(Boolean)
    .join('\n\n')
}

export class ModelFiller implements Filler {
  private readonly caller: ModelCaller
  private readonly gate: SpendGate
  private readonly jobId: string
  private readonly approvedInr: number
  private readonly usdToInr: number
  private readonly approved: boolean
  /** Real spend of this job so far. */
  spentInr = 0

  constructor(opts: {
    caller: ModelCaller
    gate: SpendGate
    jobId: string
    /** The estimate the person approved for the whole job. */
    approvedInr: number
    usdToInr?: number
    /** The person said yes to "ask me above ₹X". */
    approved?: boolean
  }) {
    this.caller = opts.caller
    this.gate = opts.gate
    this.jobId = opts.jobId
    this.approvedInr = opts.approvedInr
    this.usdToInr = opts.usdToInr ?? DEFAULT_USD_TO_INR
    this.approved = opts.approved ?? false
  }

  async fill(req: FillRequest, signal: AbortSignal): Promise<unknown> {
    const prompt = fillPrompt(req)
    const estimate = inrFor(
      this.caller.engine.model,
      PROMPT_OVERHEAD_TOKENS + textTokens(prompt.length),
      estimateOutTokens(req.tool, req.args),
      this.usdToInr,
    )
    if (this.spentInr + estimate > this.approvedInr * (1 + OVERRUN))
      throw new StepError('budget', refusalText('pause'))
    try {
      const out = await guardedPaidCall(
        this.gate,
        this.jobId,
        estimate,
        async () => {
          const a = await this.caller.call(prompt, signal)
          this.spentInr += a.costInr
          return a
        },
        { approved: this.approved },
      )
      return out.text
    } catch (e) {
      if (e instanceof SpendRefused)
        throw new StepError('budget', refusalText(e.reason))
      throw e
    }
  }
}
