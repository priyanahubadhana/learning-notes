import type { IconName } from '../tools/icons'
import type { PillKind } from './pillLogic'

export type { PillKind } from './pillLogic'

export type PillSpec = {
  id: string
  /** Fixes the place in the stack. */
  kind: PillKind
  icon: IconName
  /** "Recording 02:14", "Update ready", "120%" */
  label: string
  /** problem = danger icon + words */
  tone?: 'plain' | 'active' | 'problem'
  /** 0..1 ring around the icon */
  progress?: number
  /** Opens the pill's own pop-up or screen, beside the stack; gets the pill button to anchor on. */
  onTap?(anchor: HTMLElement): void
  /** One inline button, e.g. Stop. */
  action?: { icon: IconName; label: string; run(): void }
  /** Shows ✕ (update ready, updated). Never for a recording pill. */
  dismissable?: boolean
  onDismiss?(): void
  /** ms; zoom 2000, "Updated to x" 4000. Hover, focus or touch holds it. */
  ttl?: number
}

export type PillEntry = {
  spec: PillSpec
  seq: number
  /** Fading out; leaves the stack when the fade ends. */
  leaving: boolean
}

export const FADE_MS = 200
/** Kinds whose label changes every second: read on focus, never re-announced. */
const QUIET: ReadonlySet<PillKind> = new Set(['recording', 'timer', 'zoom'])

const sigOf = (s: PillSpec): string =>
  JSON.stringify([
    s.id,
    s.kind,
    s.icon,
    s.label,
    s.tone,
    s.progress,
    s.dismissable,
    s.ttl,
    s.action?.icon,
    s.action?.label,
  ])

export interface Said {
  text: string
  assertive: boolean
  n: number
}

/**
 * The pills that are on screen. Owners call `set` / `leave` (through
 * `usePill`); nobody positions a pill. Plain TypeScript, so it is unit-tested
 * without a screen.
 */
export function createPillStore(fadeMs: () => number = () => FADE_MS) {
  let entries: PillEntry[] = []
  let seq = 0
  let said: Said = { text: '', assertive: false, n: 0 }
  const sigs = new Map<string, string>()
  /** Signature of a pill that timed out or was dismissed: it stays away until it changes. */
  const gone = new Map<string, string>()
  const timers = new Map<string, ReturnType<typeof setTimeout>>()
  const fades = new Map<string, ReturnType<typeof setTimeout>>()
  const subs = new Set<() => void>()
  const emit = () => subs.forEach((s) => s())
  const say = (text: string, assertive: boolean) => {
    said = { text, assertive, n: said.n + 1 }
  }
  const stopTimer = (id: string) => {
    const t = timers.get(id)
    if (t) clearTimeout(t)
    timers.delete(id)
  }
  const startTimer = (id: string, ms: number | undefined) => {
    stopTimer(id)
    if (ms)
      timers.set(
        id,
        setTimeout(() => expire(id), ms),
      )
  }

  function drop(id: string) {
    entries = entries.filter((e) => e.spec.id !== id)
    sigs.delete(id)
    emit()
  }
  function fadeOut(id: string) {
    stopTimer(id)
    const e = entries.find((x) => x.spec.id === id)
    if (!e || e.leaving) return
    const ms = fadeMs()
    if (ms === 0) return drop(id)
    entries = entries.map((x) => (x === e ? { ...x, leaving: true } : x))
    emit()
    fades.set(
      id,
      setTimeout(() => {
        fades.delete(id)
        drop(id)
      }, ms),
    )
  }
  /** Timed out or dismissed: leaves and stays away until the spec changes. */
  function expire(id: string) {
    const sig = sigs.get(id)
    if (sig) gone.set(id, sig)
    fadeOut(id)
  }

  return {
    subscribe(cb: () => void) {
      subs.add(cb)
      return () => subs.delete(cb)
    },
    entries: () => entries,
    said: () => said,
    set(spec: PillSpec) {
      const sig = sigOf(spec)
      if (gone.get(spec.id) === sig) return
      gone.delete(spec.id)
      const old = entries.find((e) => e.spec.id === spec.id)
      if (old && !old.leaving && sigs.get(spec.id) === sig) {
        old.spec = spec // only the functions may have changed
        return
      }
      const f = fades.get(spec.id)
      if (f) clearTimeout(f)
      fades.delete(spec.id)
      sigs.set(spec.id, sig)
      if (old) {
        entries = entries.map((e) =>
          e === old ? { ...e, spec, leaving: false } : e,
        )
        if (old.spec.tone !== 'problem' && spec.tone === 'problem')
          say(spec.label, true)
        else if (old.spec.label !== spec.label && !QUIET.has(spec.kind))
          say(spec.label, spec.tone === 'problem')
      } else {
        entries = [...entries, { spec, seq: ++seq, leaving: false }]
        say(spec.label, spec.tone === 'problem')
      }
      startTimer(spec.id, spec.ttl)
      emit()
    },
    /** The owner no longer wants it. */
    leave(id: string) {
      gone.delete(id)
      fadeOut(id)
    },
    /** The person pressed the cross. */
    dismiss(id: string) {
      entries.find((e) => e.spec.id === id)?.spec.onDismiss?.()
      expire(id)
    },
    /** Hover, focus or touch holds a timed pill; letting go starts its time again. */
    hold(id: string, on: boolean) {
      const e = entries.find((x) => x.spec.id === id)
      if (!e || e.leaving) return
      if (on) stopTimer(id)
      else startTimer(id, e.spec.ttl)
    },
    clear() {
      timers.forEach((t) => clearTimeout(t))
      fades.forEach((t) => clearTimeout(t))
      timers.clear()
      fades.clear()
      entries = []
      sigs.clear()
      gone.clear()
      emit()
    },
  }
}

export type PillStore = ReturnType<typeof createPillStore>
