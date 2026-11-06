// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { barStep, startBar, type BarState } from './barMode'
import { glideTo, easeInOutCubic } from './glide'
import {
  isSavedThemes,
  MAX_SAVED_THEMES,
  PRESET_THEMES,
  withSaved,
  type SavedTheme,
} from './savedThemes'

describe('reader bar modes', () => {
  const run = (mode: Parameters<typeof barStep>[0], ys: number[]) => {
    let s: BarState = startBar()
    return ys.map((y) => (s = barStep(mode, s, y)).visible)
  }

  it('mini: hides while scrolling down, returns after scrolling up 12 px', () => {
    expect(run('mini', [0, 100, 300, 295, 285])).toEqual([
      true,
      false,
      false,
      false,
      true,
    ])
  })

  it('mini: small wobbles do not flip it, and the top always shows it', () => {
    expect(run('mini', [100, 104, 99, 105])).toEqual([
      false,
      false,
      false,
      false,
    ])
    expect(run('mini', [300, 4])).toEqual([false, true])
  })

  it('always keeps it, top shows it only near the top', () => {
    expect(run('always', [0, 500, 900])).toEqual([true, true, true])
    expect(run('top', [0, 6, 50, 0])).toEqual([true, true, false, true])
  })
})

describe('glide', () => {
  function fakeScroller(height = 800, top = 0) {
    const listeners = new Map<string, () => void>()
    const el = {
      scrollTop: top,
      clientHeight: height,
      addEventListener: (name: string, fn: () => void) =>
        listeners.set(name, fn),
      removeEventListener: (name: string) => listeners.delete(name),
    }
    return { el: el as unknown as HTMLElement, raw: el, listeners }
  }
  function clock() {
    let time = 0
    const frames: (() => void)[] = []
    return {
      now: () => time,
      raf: (fn: () => void) => frames.push(fn),
      tick: (ms: number) => {
        time += ms
        const run = frames.splice(0)
        run.forEach((f) => f())
      },
    }
  }

  it('takes the same time whatever the distance', async () => {
    for (const distance of [500, 4000]) {
      const { el, raw } = fakeScroller()
      const c = clock()
      const g = glideTo(el, distance, 1200, { now: c.now, raf: c.raf })
      c.tick(600)
      expect(raw.scrollTop).toBeGreaterThan(0)
      expect(raw.scrollTop).toBeLessThan(distance)
      c.tick(500)
      expect(raw.scrollTop).toBeLessThan(distance) // not there yet at 1100 ms
      c.tick(100)
      expect(raw.scrollTop).toBe(distance)
      await g.done
    }
  })

  it('a very long jump first leaps to 1.5 screens away', () => {
    const { el, raw } = fakeScroller(800, 0)
    const c = clock()
    glideTo(el, 10_000, 1200, { now: c.now, raf: c.raf })
    expect(raw.scrollTop).toBe(10_000 - 1200)
  })

  it('a touch stops it where it is', async () => {
    const { el, raw, listeners } = fakeScroller()
    const c = clock()
    const g = glideTo(el, 1000, 1200, { now: c.now, raf: c.raf })
    c.tick(300)
    const at = raw.scrollTop
    listeners.get('touchstart')?.()
    c.tick(600)
    expect(raw.scrollTop).toBe(at)
    await g.done
  })

  it('instant (reduced motion) jumps at once', () => {
    const { el, raw } = fakeScroller()
    glideTo(el, 700, 1200, { instant: true })
    expect(raw.scrollTop).toBe(700)
  })

  it('the easing starts and ends at rest', () => {
    expect(easeInOutCubic(0)).toBe(0)
    expect(easeInOutCubic(1)).toBe(1)
    expect(easeInOutCubic(0.5)).toBe(0.5)
  })
})

describe('saved themes', () => {
  const look = PRESET_THEMES[0]
  const mine = (name: string): SavedTheme => ({
    name,
    theme: look.theme,
    font: look.font,
    size: look.size,
    spacing: look.spacing,
    margin: look.margin,
    width: look.width,
    align: look.align,
  })

  it('validates the stored list', () => {
    expect(isSavedThemes([mine('A')])).toBe(true)
    expect(isSavedThemes([{ ...mine('A'), size: 77 }])).toBe(false)
    expect(isSavedThemes([{ ...mine('A'), font: 'custom:<x>' }])).toBe(false)
    expect(isSavedThemes([{ ...mine(''), name: '' }])).toBe(false)
    expect(
      isSavedThemes(Array.from({ length: 9 }, (_, i) => mine(`T${i}`))),
    ).toBe(false)
  })

  it('a same name is replaced; the ninth pushes out the oldest', () => {
    let list: SavedTheme[] = []
    for (let i = 0; i < MAX_SAVED_THEMES; i++)
      list = withSaved(list, `T${i}`, look)
    expect(list).toHaveLength(8)
    list = withSaved(list, 'T3', { ...look, size: 130 })
    expect(list).toHaveLength(8)
    expect(list.at(-1)).toMatchObject({ name: 'T3', size: 130 })
    list = withSaved(list, 'New', look)
    expect(list).toHaveLength(8)
    expect(list.some((s) => s.name === 'T0')).toBe(false)
  })

  it('ready-made looks are valid', () => {
    for (const p of PRESET_THEMES) {
      expect(isSavedThemes([{ ...p, name: p.id }])).toBe(true)
    }
  })
})
