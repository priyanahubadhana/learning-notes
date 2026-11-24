// @vitest-environment jsdom
import { act, createElement as h } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ToastStack } from './ToastStack'
import { createToasts } from './toastLogic'
import { $, $$, byLabel, cleanDom, click, mount } from './testHelpers'

afterEach(() => {
  vi.useRealTimers()
  cleanDom()
})

const texts = () => $$('.fb-toast__text').map((e) => e.textContent)
const shown = (t: ReturnType<typeof createToasts>) =>
  t.queue.visible().map((x) => x.message)

describe('createToasts', () => {
  it('done lasts 2.5 s, undo 6 s, a problem stays', () => {
    vi.useFakeTimers()
    const t = createToasts()
    t.push('done', 'a')
    t.push('undo', 'b')
    t.push('problem', 'c')
    vi.advanceTimersByTime(2499)
    expect(shown(t)).toEqual(['a', 'b', 'c'])
    vi.advanceTimersByTime(2)
    expect(shown(t)).toEqual(['b', 'c'])
    vi.advanceTimersByTime(3600)
    expect(shown(t)).toEqual(['c'])
    vi.advanceTimersByTime(60000)
    expect(shown(t)).toEqual(['c'])
  })

  it('shows at most 3; the 4th pushes out the oldest done one', () => {
    const t = createToasts()
    t.push('done', 'a')
    t.push('undo', 'b')
    t.push('done', 'c')
    t.push('done', 'd')
    expect(shown(t)).toEqual(['b', 'c', 'd'])
  })

  it('never pushes out an Undo or a problem; the newer one waits', () => {
    const t = createToasts()
    t.push('undo', 'a')
    t.push('problem', 'b')
    t.push('undo', 'c')
    t.push('done', 'd')
    expect(shown(t)).toEqual(['a', 'b', 'c'])
    expect(t.queue.waiting().map((x) => x.message)).toEqual(['d'])
  })

  it('a waiting toast starts its timer when it shows', () => {
    vi.useFakeTimers()
    const t = createToasts()
    const a = t.push('undo', 'a')
    t.push('undo', 'b')
    t.push('undo', 'c')
    t.push('done', 'd')
    t.dismiss(a)
    expect(shown(t)).toContain('d')
    vi.advanceTimersByTime(2600)
    expect(shown(t)).not.toContain('d')
  })

  it('Undo runs the stored function and closes the toast', () => {
    const t = createToasts()
    const fn = vi.fn()
    const id = t.push('undo', 'a', fn)
    t.undo(id)
    expect(fn).toHaveBeenCalledTimes(1)
    expect(shown(t)).toEqual([])
  })

  it('holding pauses the timer and gives at least 1.5 s after release', () => {
    vi.useFakeTimers()
    const t = createToasts()
    const id = t.push('done', 'a')
    vi.advanceTimersByTime(2000)
    t.hold(id, true)
    vi.advanceTimersByTime(10000)
    expect(shown(t)).toEqual(['a'])
    t.hold(id, false)
    vi.advanceTimersByTime(1400)
    expect(shown(t)).toEqual(['a'])
    vi.advanceTimersByTime(200)
    expect(shown(t)).toEqual([])
  })
})

describe('ToastStack', () => {
  it('is a polite live region', () => {
    mount(h(ToastStack, { toasts: createToasts() }))
    const r = $('[data-testid="fb-toasts"]')
    expect(r?.getAttribute('role')).toBe('status')
    expect(r?.getAttribute('aria-live')).toBe('polite')
  })

  it('draws the visible toasts and the Undo button works', () => {
    const t = createToasts()
    const fn = vi.fn()
    mount(h(ToastStack, { toasts: t }))
    act(() => {
      t.push('undo', 'Moved', fn)
      t.push('done', 'Saved')
    })
    expect(texts()).toEqual(['Moved', 'Saved'])
    click($('[data-testid="fb-toast-undo"]'))
    expect(fn).toHaveBeenCalledTimes(1)
    expect(texts()).toEqual(['Saved'])
  })

  it('a problem has a close button and no timer', () => {
    const t = createToasts()
    mount(h(ToastStack, { toasts: t }))
    act(() => {
      t.push('problem', 'Failed')
    })
    click(byLabel('Dismiss message'))
    expect(texts()).toEqual([])
  })
})

describe('createToasts with its own clock', () => {
  it('ends a toast only when the injected clock says so', () => {
    let now = 0
    let due: { at: number; fn: () => void } | undefined
    const t = createToasts({
      now: () => now,
      setTimer: (fn, ms) => (due = { at: now + ms, fn }),
      clearTimer: () => (due = undefined),
    })
    const id = t.push('done', 'Saved')
    expect(due?.at).toBe(2500)
    expect(t.queue.visible().map((x) => x.id)).toEqual([id])
    now = 2500
    due?.fn()
    expect(t.queue.visible()).toHaveLength(0)
  })
})
