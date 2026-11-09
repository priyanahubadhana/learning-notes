import {
  onGestureReset,
  registerToolState,
  type ResetReason,
} from './gestureReset'

/**
 * One place that knows "a pointer is down" (tools robustness, step 1).
 *
 * Before this, about ten modules each kept their own flag, and the iPad
 * often drops `pointerup` and `pointercancel`, so a flag could stay true
 * for ever while the app stayed in front. Now a module that starts a
 * gesture calls `begin`, and every way out goes back to `idle` through one
 * function: a lift, a cancel, a lost pointer capture, a blur or an app
 * switch (the watchdog), a tool change, or the age limit (a pointer that
 * is down and has not moved for AGE_LIMIT_MS is dropped).
 *
 * Each `begin` gives the way to reset its owner. `abort` calls it, so the
 * owner forgets its half gesture. A normal lift only removes the entry.
 */

export type MachineState =
  'idle' | 'pressing' | 'drawing' | 'selecting' | 'transforming'

/** For a gesture that does not know its pointer: any movement keeps it alive. */
export const ANY_POINTER = -1

/** A pointer that is down and has not moved this long (ms) is dropped. */
export const AGE_LIMIT_MS = 4000
const SWEEP_MS = 500

export interface Down {
  id: number
  owner: string
  tool: string
  state: Exclude<MachineState, 'idle'>
  pointerType: string
  at: number
  lastMove: number
  onAbort?: (reason: ResetReason) => void
}

let downs: Down[] = []
let toolNow = ''
let now: () => number = () => Date.now()
let sweeper: ReturnType<typeof setInterval> | undefined
const listeners = new Set<() => void>()
/** The last abort, for the tool-state dump. */
let lastAbort: { reason: ResetReason; owner: string; at: number } | null = null
let aborts = 0
/** The last pointer event of any kind (the health check waits for quiet). */
let lastEventAt = 0

const notify = () => {
  for (const fn of [...listeners]) fn()
}

function sweep() {
  if (downs.length === 0) {
    stopSweeper()
    return
  }
  const t = now()
  for (const d of [...downs]) {
    if (t - d.lastMove >= AGE_LIMIT_MS) drop(d, 'timeout')
  }
}

function startSweeper() {
  if (sweeper === undefined) sweeper = setInterval(sweep, SWEEP_MS)
}

function stopSweeper() {
  if (sweeper !== undefined) clearInterval(sweeper)
  sweeper = undefined
}

function drop(d: Down, reason: ResetReason) {
  downs = downs.filter((x) => x !== d)
  lastAbort = { reason, owner: d.owner, at: now() }
  aborts++
  try {
    d.onAbort?.(reason)
  } catch (e) {
    console.error('Input machine abort', e)
  }
  if (downs.length === 0) stopSweeper()
  notify()
}

export const inputMachine = {
  /** A pointer went down for `owner`; `onAbort` forgets the owner's half gesture. */
  begin(
    e: { pointerId: number; pointerType?: string },
    owner: string,
    onAbort?: (reason: ResetReason) => void,
    state: Down['state'] = 'pressing',
  ): void {
    // One entry per owner and pointer.
    downs = downs.filter((d) => !(d.owner === owner && d.id === e.pointerId))
    const t = now()
    downs.push({
      id: e.pointerId,
      owner,
      tool: toolNow,
      state,
      pointerType: e.pointerType ?? '',
      at: t,
      lastMove: t,
      onAbort,
    })
    startSweeper()
    notify()
  },

  /** The owner's gesture moved on (pressing to selecting, and so on). */
  setState(owner: string, state: Down['state']): void {
    for (const d of downs) if (d.owner === owner) d.state = state
    notify()
  },

  /** A pointer moved: it is alive. */
  move(e: { pointerId: number }): void {
    const t = now()
    lastEventAt = t
    for (const d of downs) {
      if (d.id === e.pointerId || d.id === ANY_POINTER) d.lastMove = t
    }
  },

  /** The pointer lifted or was cancelled (not an abort: no owner reset). */
  end(e: { pointerId: number }, owner?: string): void {
    const before = downs.length
    downs = downs.filter(
      (d) =>
        !(d.id === e.pointerId && (owner === undefined || d.owner === owner)),
    )
    if (downs.length !== before) {
      if (downs.length === 0) stopSweeper()
      notify()
    }
  },

  /** The owner is done (whatever pointer it had). */
  endOwner(owner: string): void {
    const before = downs.length
    downs = downs.filter((d) => d.owner !== owner)
    if (downs.length !== before) {
      if (downs.length === 0) stopSweeper()
      notify()
    }
  },

  /** Drops every gesture (or the owner's) and resets its owner. */
  abort(reason: ResetReason, owner?: string): void {
    for (const d of [...downs]) {
      if (owner === undefined || d.owner === owner) drop(d, reason)
    }
  },

  /** The gesture of this owner (and pointer) is live. */
  isDown(owner?: string, id?: number): boolean {
    return downs.some(
      (d) =>
        (owner === undefined || d.owner === owner) &&
        (id === undefined || d.id === id),
    )
  },

  /** The newest gesture, or null (idle). */
  current(): Down | null {
    return downs[downs.length - 1] ?? null
  },

  state(): MachineState {
    return downs[downs.length - 1]?.state ?? 'idle'
  },

  /** How long (ms) since any pointer event was seen (a large number: never). */
  quietForMs(): number {
    return lastEventAt ? now() - lastEventAt : 1e9
  },

  /** How long (ms) the owner's gesture has not moved (0: it has none). */
  idleMs(owner: string): number {
    const d = downs.find((x) => x.owner === owner)
    return d ? now() - d.lastMove : 0
  },

  /** How long (ms) the owner's gesture has been down. */
  age(owner: string): number {
    const d = downs.find((x) => x.owner === owner)
    return d ? now() - d.at : 0
  },

  subscribe(fn: () => void): () => void {
    listeners.add(fn)
    return () => {
      listeners.delete(fn)
    }
  },

  /** The tool now chosen; a change drops every gesture. */
  setTool(tool: string): void {
    if (tool === toolNow) return
    toolNow = tool
    if (downs.length) inputMachine.abort('toolchange')
  },
}

/** What the document sends; narrow so tests can fake it. */
export interface MachineDoc {
  addEventListener: (type: string, fn: (e: Event) => void, c?: boolean) => void
  removeEventListener: (
    type: string,
    fn: (e: Event) => void,
    c?: boolean,
  ) => void
}

/**
 * Listens on the document (capture phase, before any module can stop the
 * event): movement keeps a pointer alive; a lift, a cancel or a lost
 * capture ends it. A lost capture with the pointer still down aborts the
 * owner. The watchdog (app switch, blur) is joined too.
 */
export function installInputMachine(
  doc: MachineDoc = document,
  clock: () => number = () => Date.now(),
): () => void {
  now = clock
  const ptr = (e: Event) => e as PointerEvent
  // A new touch is not movement of an old one (a stale gesture of the same
  // pointer id must still look idle when the Lasso decides).
  const onDown = () => {
    lastEventAt = now()
  }
  const onMove = (e: Event) => inputMachine.move(ptr(e))
  const onEnd = (e: Event) => {
    lastEventAt = now()
    inputMachine.end(ptr(e))
  }
  const onLost = (e: Event) => {
    // After a normal lift the entry is gone already; a still-live one lost
    // its pointer (the system took it): the owner gives up.
    const id = ptr(e).pointerId
    for (const d of downs.filter((x) => x.id === id)) drop(d, 'lost')
  }
  doc.addEventListener('pointerdown', onDown, true)
  doc.addEventListener('pointermove', onMove, true)
  doc.addEventListener('pointerup', onEnd, true)
  doc.addEventListener('pointercancel', onEnd, true)
  doc.addEventListener('lostpointercapture', onLost, true)
  // The watchdog already reset every module for these: just forget.
  const unreset = onGestureReset((reason) => {
    if (downs.length === 0) return
    downs = []
    stopSweeper()
    lastAbort = { reason, owner: '*', at: now() }
    aborts++
    notify()
  })
  const unread = registerToolState('machine', () => ({
    state: inputMachine.state(),
    down: downs.map((d) => ({
      owner: d.owner,
      id: d.id,
      state: d.state,
      tool: d.tool,
      type: d.pointerType,
      ageMs: now() - d.at,
      idleMs: now() - d.lastMove,
    })),
    ageLimitMs: AGE_LIMIT_MS,
    aborts,
    lastAbort: lastAbort
      ? `${lastAbort.owner} ${lastAbort.reason} ${Math.round((now() - lastAbort.at) / 100) / 10}s ago`
      : 'never',
  }))
  return () => {
    doc.removeEventListener('pointerdown', onDown, true)
    doc.removeEventListener('pointermove', onMove, true)
    doc.removeEventListener('pointerup', onEnd, true)
    doc.removeEventListener('pointercancel', onEnd, true)
    doc.removeEventListener('lostpointercapture', onLost, true)
    unreset()
    unread()
    stopSweeper()
  }
}

/** Tests only. */
export function resetInputMachineForTests(): void {
  downs = []
  toolNow = ''
  now = () => Date.now()
  stopSweeper()
  listeners.clear()
  lastAbort = null
  aborts = 0
  lastEventAt = 0
}
