import { domOverlayEvents, type OverlayEvents } from './events'
import { LAYERS, type Layer } from './layers'

export interface OverlayOptions {
  id: string
  layer: Layer
  close: () => void
  /** True for an element that belongs to this overlay. */
  inside: (el: Element) => boolean
  /** Focus returns here when Esc closes the overlay. */
  opener?: HTMLElement | null
  /** The overlay this one was opened from; it stays open. */
  parentId?: string
  /**
   * The first tap outside only closes this overlay and is swallowed (its
   * pointerdown, pointerup and click reach nothing else). Default: on for
   * menus, cards and sheets (a card is a sheet on a phone), off otherwise.
   */
  swallowOutsideTap?: boolean
}

export interface OverlayHandle {
  close(): void
}

interface Entry extends OverlayOptions {
  seq: number
}

const FLOATING: ReadonlySet<Layer> = new Set<Layer>(['menu', 'card', 'sheet'])

export function createOverlayManager(
  events: OverlayEvents = domOverlayEvents(),
) {
  let entries: Entry[] = []
  let seq = 0
  let unsubs: Array<() => void> = []

  const byId = (id: string) => entries.find((e) => e.id === id)

  function ancestors(e: Entry): Set<string> {
    const ids = new Set<string>()
    let p = e.parentId ? byId(e.parentId) : undefined
    while (p && !ids.has(p.id)) {
      ids.add(p.id)
      p = p.parentId ? byId(p.parentId) : undefined
    }
    return ids
  }

  function detach() {
    unsubs.forEach((u) => u())
    unsubs = []
  }

  function attach() {
    if (unsubs.length) return
    unsubs = [
      events.onEscape(onEscape),
      events.onPointerDown(onPointerDown),
      events.onBackground(onBackground),
    ]
  }

  /** Removes the entry (and anything opened from it), then runs its close. */
  function remove(entry: Entry) {
    if (!entries.includes(entry)) return
    const kids = entries.filter((e) => ancestors(e).has(entry.id))
    entries = entries.filter((e) => e !== entry && !kids.includes(e))
    if (!entries.length) detach()
    kids.forEach((k) => k.close())
    entry.close()
  }

  function ownedBy(entry: Entry, el: Element): boolean {
    if (entry.inside(el)) return true
    return entries.some((e) => ancestors(e).has(entry.id) && e.inside(el))
  }

  function topEntry(): Entry | undefined {
    let best: Entry | undefined
    for (const e of entries) {
      if (
        !best ||
        LAYERS[e.layer] > LAYERS[best.layer] ||
        (LAYERS[e.layer] === LAYERS[best.layer] && e.seq > best.seq)
      )
        best = e
    }
    return best
  }

  function onEscape() {
    const top = topEntry()
    if (!top) return
    remove(top)
    top.opener?.focus()
  }

  /** True when the tap closed an overlay that swallows its outside tap. */
  function onPointerDown(target: Element): boolean {
    if (target.closest('[data-popup-trigger]')) return false
    let swallow = false
    for (const e of [...entries]) {
      if (!entries.includes(e) || ownedBy(e, target)) continue
      if (e.swallowOutsideTap ?? FLOATING.has(e.layer)) swallow = true
      remove(e)
    }
    return swallow
  }

  function onBackground() {
    for (const e of [...entries])
      if (e.layer === 'menu' || e.layer === 'card') remove(e)
  }

  function open(opts: OverlayOptions): OverlayHandle {
    const existing = byId(opts.id)
    if (existing) remove(existing)
    const entry: Entry = { ...opts, seq: ++seq }
    const keep = ancestors(entry)
    for (const e of [...entries]) {
      if (keep.has(e.id) || !entries.includes(e)) continue
      const sameLayer = e.layer === entry.layer
      const bothFloating = FLOATING.has(e.layer) && FLOATING.has(entry.layer)
      if (sameLayer || bothFloating) remove(e)
    }
    entries.push(entry)
    attach()
    return { close: () => remove(entry) }
  }

  return {
    open,
    isOpen: (id: string) => !!byId(id),
    top: () => topEntry()?.id ?? null,
    count: () => entries.length,
  }
}

export type OverlayManager = ReturnType<typeof createOverlayManager>

let instance: OverlayManager | undefined
const get = () => (instance ??= createOverlayManager())

/** The app-wide manager, created on first use. */
export const overlay: OverlayManager = {
  open: (o) => get().open(o),
  isOpen: (id) => get().isOpen(id),
  top: () => get().top(),
  count: () => get().count(),
}
