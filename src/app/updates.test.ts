import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  dismissUpdateOffer,
  offerUpdate,
  onUpdateOffer,
  repeatUpdateOffer,
  resetUpdates,
  throttled,
  watchUpdateTriggers,
  UPDATE_EVERY_MS,
  UPDATE_THROTTLE_MS,
  watchForUpdates,
} from './updates'

describe('looking for updates', () => {
  it('looks at the start and each time the app comes to the front', () => {
    let changed = () => {}
    const page = {
      visibilityState: 'visible',
      addEventListener: (_: 'visibilitychange', run: () => void) => {
        changed = run
      },
    }
    const check = vi.fn()
    watchForUpdates(page, check)
    expect(check).toHaveBeenCalledTimes(1)
    page.visibilityState = 'hidden'
    changed()
    expect(check).toHaveBeenCalledTimes(1)
    page.visibilityState = 'visible'
    changed()
    expect(check).toHaveBeenCalledTimes(2)
  })
})

describe('extra update checks (R6-14)', () => {
  it('the throttle lets one look through per 5 minutes', () => {
    let clock = 1_000_000
    const run = vi.fn()
    const soft = throttled(run, UPDATE_THROTTLE_MS, () => clock)
    expect(soft()).toBe(true)
    clock += UPDATE_THROTTLE_MS - 1
    expect(soft()).toBe(false)
    expect(run).toHaveBeenCalledTimes(1)
    clock += 1
    expect(soft()).toBe(true)
    expect(run).toHaveBeenCalledTimes(2)
  })

  it('navigation, typing, touch and the 10 minute timer all use the throttle', () => {
    const handlers = new Map<string, () => void>()
    let tick = () => {}
    const win = {
      document: { visibilityState: 'visible' },
      addEventListener: (type: string, run: () => void) =>
        void handlers.set(type, run),
      setInterval: (run: () => void, ms: number) => {
        expect(ms).toBe(UPDATE_EVERY_MS)
        tick = run
      },
    }
    let clock = 0
    const check = vi.fn()
    watchUpdateTriggers(win, check, () => clock)
    handlers.get('keydown')!() // the first typing looks
    handlers.get('hashchange')!() // too soon
    handlers.get('pointerdown')!()
    expect(check).toHaveBeenCalledTimes(1)
    clock += UPDATE_EVERY_MS
    win.document.visibilityState = 'hidden'
    tick() // not showing: no look
    expect(check).toHaveBeenCalledTimes(1)
    win.document.visibilityState = 'visible'
    tick()
    expect(check).toHaveBeenCalledTimes(2)
  })
})

describe('update offer', () => {
  beforeEach(resetUpdates)

  it('reaches a listener that is already there', () => {
    const listen = vi.fn()
    const apply = vi.fn()
    onUpdateOffer(listen)
    offerUpdate(apply)
    expect(listen).toHaveBeenCalledWith(apply)
    expect(apply).not.toHaveBeenCalled() // only the user starts the update
  })

  it('waits for a listener that comes later', () => {
    const listen = vi.fn()
    const apply = vi.fn()
    offerUpdate(apply)
    onUpdateOffer(listen)
    expect(listen).toHaveBeenCalledWith(apply)
  })

  it('repeats only when an update is waiting', () => {
    const listen = vi.fn()
    onUpdateOffer(listen)
    repeatUpdateOffer()
    expect(listen).not.toHaveBeenCalled()
    offerUpdate(vi.fn())
    repeatUpdateOffer()
    expect(listen).toHaveBeenCalledTimes(2)
  })

  it('stops after the listener leaves', () => {
    const listen = vi.fn()
    onUpdateOffer(listen)()
    offerUpdate(vi.fn())
    expect(listen).not.toHaveBeenCalled()
  })
})

describe('closing the update offer', () => {
  beforeEach(resetUpdates)

  it('keeps it closed when the app comes back to the front', () => {
    const shown = vi.fn()
    onUpdateOffer(shown)
    offerUpdate(() => {})
    expect(shown).toHaveBeenCalledTimes(1)
    dismissUpdateOffer()
    repeatUpdateOffer()
    expect(shown).toHaveBeenCalledTimes(1)
  })
})
