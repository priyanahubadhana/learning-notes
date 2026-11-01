import { beforeEach, describe, expect, it, vi } from 'vitest'

type Entry = { state: unknown; url: string }

/** A small fake of the browser's history list. */
function fakeBrowser() {
  const entries: Entry[] = [{ state: null, url: '#/' }]
  let index = 0
  const pop: (() => void)[] = []
  const stored: Record<string, string> = {}
  vi.stubGlobal('history', {
    get state() {
      return entries[index].state
    },
    replaceState: (state: unknown, _: string, url?: string) => {
      entries[index] = { state, url: url ?? entries[index].url }
    },
    pushState: (state: unknown, _: string, url: string) => {
      entries.length = index + 1
      entries.push({ state, url })
      index += 1
    },
  })
  vi.stubGlobal('window', {
    addEventListener: (_: string, listener: () => void) => pop.push(listener),
  })
  vi.stubGlobal('sessionStorage', {
    getItem: (key: string) => stored[key] ?? null,
    setItem: (key: string, value: string) => {
      stored[key] = value
    },
  })
  return {
    entries,
    stored,
    go(step: number) {
      index += step
      pop.forEach((listener) => listener())
    },
    link(url: string) {
      entries.length = index + 1
      entries.push({ state: null, url })
      index += 1
      pop.forEach((listener) => listener())
    },
  }
}

describe('navHistory', () => {
  beforeEach(() => vi.resetModules())

  it('numbers entries, keeps them on replace, and follows Back', async () => {
    const browser = fakeBrowser()
    const nav = await import('./navHistory')
    nav.startNavHistory()
    nav.pushEntry('#/a')
    nav.pushEntry('#/b')
    nav.replaceEntry('#/b2')
    expect(browser.entries).toEqual([
      { state: { nav: 0 }, url: '#/' },
      { state: { nav: 1 }, url: '#/a' },
      { state: { nav: 2 }, url: '#/b2' },
    ])
    expect(browser.stored['learning-notes:nav-last']).toBe('2')

    browser.go(-1)
    expect(browser.stored['learning-notes:nav-last']).toBe('2') // Forward left
    nav.pushEntry('#/c') // what was ahead is gone
    expect(browser.entries.map((e) => e.url)).toEqual(['#/', '#/a', '#/c'])
    expect(browser.stored['learning-notes:nav-last']).toBe('2')
  })

  it('numbers an entry added by a plain link', async () => {
    const browser = fakeBrowser()
    const nav = await import('./navHistory')
    nav.startNavHistory()
    browser.link('#/from-note')
    expect(browser.entries[1].state).toEqual({ nav: 1 })
  })
})
