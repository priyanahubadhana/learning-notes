import type { Clock, FillRequest, Filler } from './filler'

/** Test doubles only. Nothing in the app imports this file. */

export class FakeClock implements Clock {
  time = 1_700_000_000_000
  sleeps: number[] = []
  now() {
    return this.time
  }
  async sleep(ms: number) {
    this.sleeps.push(ms)
    this.time += ms
  }
}

export type FillHandler = (req: FillRequest, call: number) => unknown

/**
 * A filler that answers from a table keyed by tool id. A handler may return
 * content, a string (parsed as JSON, like a model answer) or throw. `calls`
 * counts every fill, `fail(n, err)` makes the nth call throw.
 */
export class FakeFiller implements Filler {
  calls = 0
  log: FillRequest[] = []
  private failures = new Map<number, unknown>()
  private readonly handlers: Record<string, FillHandler>
  constructor(handlers: Record<string, FillHandler> = {}) {
    this.handlers = handlers
  }
  fail(nth: number, error: unknown) {
    this.failures.set(nth, error)
    return this
  }
  async fill(req: FillRequest, signal: AbortSignal): Promise<unknown> {
    if (signal.aborted) throw new Error('aborted')
    this.calls++
    this.log.push(req)
    const failure = this.failures.get(this.calls)
    if (failure) throw failure
    const handler = this.handlers[req.tool.id]
    if (!handler) throw new Error(`no fake content for ${req.tool.id}`)
    return handler(req, this.calls)
  }
}
