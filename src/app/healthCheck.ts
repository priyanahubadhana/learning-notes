import { editableIn, pageMode } from '../editor/editPolicy'
import { lockCount } from '../editor/editLock'
import { resetGestures, registerToolState, toolState } from './gestureReset'
import { inputMachine } from './inputMachine'
import { pointerListenerTotal } from './listenerCount'

/**
 * The health check (tools robustness, step 5): looks for the states that made
 * the tools stop, and heals them, without anyone leaving the app.
 *
 * It runs when the app comes back (visible, pageshow, focus) and every 30 s
 * while idle (the page is showing and no pointer was seen for 30 s). Each
 * check says what is wrong in one line; the heal is the gesture reset (the
 * same one the watchdog runs), a repaint, or putting the page's
 * contenteditable right. Every problem and heal is logged in the tool-state
 * dump under `health`. A heal that does not hold, twice within 60 s for the
 * same problem, asks for a soft refresh (softRefresh.ts) through the stuck
 * handler: the last resort, at most once every 10 minutes.
 */

/** The quiet sweep looks this often (ms); it runs only when idle. */
const SWEEP_EVERY_MS = 10_000
/** No pointer for this long (ms) before the quiet sweep runs. */
export const IDLE_SWEEP_MS = 30_000
/** The same heal failing twice within this long asks for a soft refresh. */
export const REPEAT_WINDOW_MS = 60_000
/** A pointer event this recent (ms) means "not quiet": flags may be real. */
const QUIET_MS = 400

export interface Probe {
  name: string
  /** What is wrong (one line), or null. */
  check: () => string | null
  heal: () => void
}

interface Entry {
  at: number
  name: string
  problem: string
  healed: boolean
  reason: string
}

const probes: Probe[] = []
const log: Entry[] = []
/** When each problem last failed to heal (ms), per probe name. */
const failures = new Map<string, number[]>()
let runs = 0
let lastRun = 0
let stuck: ((why: string) => void) | null = null
/** More work for a run (the update check, the settings re-read). */
const extras = new Set<(reason: string) => void>()

/** What to do when a heal keeps failing (main.tsx: the soft refresh). */
export function setStuckHandler(fn: ((why: string) => void) | null): void {
  stuck = fn
}

/** Extra work on each run that comes from the app coming back or a long idle. */
export function onHealthRun(fn: (reason: string) => void): () => void {
  extras.add(fn)
  return () => {
    extras.delete(fn)
  }
}

/** Adds a probe (the ink engine adds its canvas and pad probes). */
export function registerProbe(p: Probe): () => void {
  probes.push(p)
  return () => {
    const i = probes.indexOf(p)
    if (i >= 0) probes.splice(i, 1)
  }
}

type Dump = Record<string, Record<string, unknown>>

/** The "a pointer is down" flags the modules show in the dump, and when each is wrong. */
const FLAGS: [string, string, (v: unknown) => boolean][] = [
  ['penGuard', 'down', (v) => v === true],
  ['ownSelection', 'pointerDown', (v) => v === true],
  ['penTap', 'penDown', (v) => v === true],
  ['selectGesture', 'active', (v) => v === true],
  ['holdSelect', 'holding', (v) => v === true],
  ['gripDrag', 'open', (v) => Number(v) > 0],
  ['editLock', 'owners', (v) => Array.isArray(v) && v.length > 0],
  [
    'ink',
    'gesture',
    (v) => typeof v === 'string' && /^(lasso|transform)#/.test(v),
  ],
]

/** The names of the flags that say "down" while the machine says idle and quiet. */
export function staleFlags(state: Dump = toolState()): string[] {
  if (inputMachine.state() !== 'idle' || inputMachine.quietForMs() < QUIET_MS) {
    return []
  }
  const out: string[] = []
  for (const [section, key, bad] of FLAGS) {
    if (bad(state[section]?.[key])) out.push(`${section}.${key}`)
  }
  // The ink pad holds a pointer capture with no gesture.
  const ink = state.ink
  if (ink && Array.isArray(ink.captured) && ink.captured.length > 0) {
    if (ink.gesture === 'none') out.push('ink.captured')
  }
  return out
}

/** The page editors whose contenteditable does not say what the mode says. */
export function wrongEditable(doc: Document = document): HTMLElement[] {
  if (lockCount() > 0) return []
  const want = editableIn(pageMode.get()) ? 'true' : 'false'
  return Array.from(
    doc.querySelectorAll<HTMLElement>('[data-page-content]'),
  ).filter((el) => el.getAttribute('contenteditable') !== want)
}

/** Most pointer listeners the document can have for this many editors. */
export const listenerLimit = (editors: number): number => 60 + 30 * editors

const builtIn: Probe[] = [
  {
    name: 'flags',
    check: () => {
      const bad = staleFlags()
      return bad.length ? `stuck: ${bad.join(', ')}` : null
    },
    heal: () => resetGestures('health'),
  },
  {
    name: 'editable',
    check: () => {
      if (inputMachine.state() !== 'idle') return null
      const bad = wrongEditable()
      return bad.length
        ? `contenteditable wrong on ${bad.length} page(s)`
        : null
    },
    heal: () => {
      const want = editableIn(pageMode.get()) ? 'true' : 'false'
      for (const el of wrongEditable()) el.setAttribute('contenteditable', want)
    },
  },
  {
    name: 'listeners',
    check: () => {
      const editors = document.querySelectorAll('.bn-editor').length
      const n = pointerListenerTotal()
      return n > listenerLimit(editors)
        ? `${n} pointer listeners for ${editors} editor(s)`
        : null
    },
    heal: () => resetGestures('health'),
  },
]

const all = (): Probe[] => [...builtIn, ...probes]

/** One look at everything; heals what it finds. Returns the problems found. */
export function runHealth(reason: string = 'manual'): string[] {
  runs++
  const t = Date.now()
  lastRun = t
  const found: string[] = []
  for (const p of all()) {
    let problem: string | null = null
    try {
      problem = p.check()
    } catch (e) {
      problem = `check failed: ${String(e)}`
    }
    if (!problem) continue
    found.push(`${p.name}: ${problem}`)
    try {
      p.heal()
    } catch (e) {
      console.error('Health heal', p.name, e)
    }
    let again: string | null = null
    try {
      again = p.check()
    } catch {
      again = 'check failed'
    }
    log.push({ at: t, name: p.name, problem, healed: !again, reason })
    if (log.length > 30) log.shift()
    if (again) failed(p.name, t, again)
  }
  for (const fn of [...extras]) {
    try {
      fn(reason)
    } catch (e) {
      console.error('Health extra', e)
    }
  }
  return found
}

function failed(name: string, t: number, why: string) {
  const list = (failures.get(name) ?? []).filter(
    (x) => t - x < REPEAT_WINDOW_MS,
  )
  list.push(t)
  failures.set(name, list)
  if (list.length >= 2) {
    failures.set(name, [])
    stuck?.(`${name}: ${why}`)
  }
}

/** The page is showing, no pointer is down and none was seen for IDLE_SWEEP_MS. */
export function idleNow(): boolean {
  return (
    document.visibilityState === 'visible' &&
    inputMachine.state() === 'idle' &&
    inputMachine.quietForMs() >= IDLE_SWEEP_MS
  )
}

/**
 * Starts the checks: on visible, pageshow and focus (a moment later, so the
 * watchdog's reset and the page's own effects have run), and every
 * `sweepMs` while idle. Returns the way to stop.
 */
export function installHealthCheck(
  win: Window = window,
  sweepMs: number = SWEEP_EVERY_MS,
): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined
  const soon = (reason: string) => {
    clearTimeout(timer)
    timer = setTimeout(() => runHealth(reason), 150)
  }
  const onVisible = () => {
    if (win.document.visibilityState === 'visible') soon('visible')
  }
  const onShow = () => soon('pageshow')
  const onFocus = () => soon('focus')
  win.document.addEventListener('visibilitychange', onVisible)
  win.addEventListener('pageshow', onShow)
  win.addEventListener('focus', onFocus)
  const sweep = setInterval(() => {
    if (idleNow()) runHealth('idle')
  }, sweepMs)
  const off = registerToolState('health', () => ({
    runs,
    lastRun: lastRun
      ? `${Math.round((Date.now() - lastRun) / 1000)}s ago`
      : 'never',
    problems: log.slice(-8).map((e) => ({
      ago: `${Math.round((Date.now() - e.at) / 1000)}s`,
      name: e.name,
      problem: e.problem,
      healed: e.healed,
      on: e.reason,
    })),
  }))
  return () => {
    clearTimeout(timer)
    clearInterval(sweep)
    win.document.removeEventListener('visibilitychange', onVisible)
    win.removeEventListener('pageshow', onShow)
    win.removeEventListener('focus', onFocus)
    off()
  }
}

/** Tests only. */
export function resetHealthForTests(): void {
  probes.length = 0
  log.length = 0
  failures.clear()
  extras.clear()
  stuck = null
  runs = 0
  lastRun = 0
}
