// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import {
  FLAG_IDS,
  FLAG_STORAGE_KEY,
  isOn,
  reloadFlags,
  resetFlags,
  setFlag,
  useFlag,
} from './flags'
import { en } from '../i18n/en'
import { enLate } from '../i18n/en/late'

const all: Record<string, string> = { ...en, ...enLate }

beforeEach(() => {
  localStorage.clear()
  window.history.replaceState(null, '', '/')
  reloadFlags()
})
afterEach(() => vi.restoreAllMocks())

describe('flags', () => {
  it('lists 26 unique switches, each with a name and a description', () => {
    expect(FLAG_IDS).toHaveLength(26)
    expect(new Set(FLAG_IDS).size).toBe(26)
    for (const id of FLAG_IDS) {
      expect(all[`flags.${id}.name`]).toBeTruthy()
      expect(all[`flags.${id}.desc`]).toBeTruthy()
    }
  })

  it('starts with every switch OFF', () => {
    for (const id of FLAG_IDS) expect(isOn(id)).toBe(false)
  })

  it('turns a switch on and off and remembers it', () => {
    setFlag('toolbar.v8', true)
    expect(isOn('toolbar.v8')).toBe(true)
    expect(JSON.parse(localStorage.getItem(FLAG_STORAGE_KEY)!)).toEqual([
      'toolbar.v8',
    ])
    reloadFlags()
    expect(isOn('toolbar.v8')).toBe(true)
    setFlag('toolbar.v8', false)
    expect(isOn('toolbar.v8')).toBe(false)
    expect(localStorage.getItem(FLAG_STORAGE_KEY)).toBe('[]')
  })

  it('resetFlags turns everything off', () => {
    setFlag('home.v2', true)
    setFlag('search.v2', true)
    resetFlags()
    expect(isOn('home.v2')).toBe(false)
    expect(isOn('search.v2')).toBe(false)
  })

  it('drops unknown ids and ignores broken stored data', () => {
    localStorage.setItem(FLAG_STORAGE_KEY, '["home.v2","gone.v9",5]')
    reloadFlags()
    expect(isOn('home.v2')).toBe(true)
    localStorage.setItem(FLAG_STORAGE_KEY, '{not json')
    reloadFlags()
    expect(isOn('home.v2')).toBe(false)
    localStorage.setItem(FLAG_STORAGE_KEY, '{"home.v2":true}')
    reloadFlags()
    expect(isOn('home.v2')).toBe(false)
  })

  it('?flags= forces switches ON for the run without saving them', () => {
    window.history.replaceState(null, '', '/?flags=toolbar.v8, textbox.v2,nope')
    reloadFlags()
    expect(isOn('toolbar.v8')).toBe(true)
    expect(isOn('textbox.v2')).toBe(true)
    expect(isOn('home.v2')).toBe(false)
    expect(localStorage.getItem(FLAG_STORAGE_KEY)).toBeNull()
    setFlag('toolbar.v8', false)
    expect(isOn('toolbar.v8')).toBe(false)
  })

  it('does not throw when storage is blocked', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    reloadFlags()
    expect(isOn('home.v2')).toBe(false)
    expect(() => setFlag('home.v2', true)).not.toThrow()
    expect(isOn('home.v2')).toBe(true)
  })

  it('useFlag follows changes', () => {
    ;(
      globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true
    const host = document.createElement('div')
    const Probe = () =>
      createElement('span', null, String(useFlag('library.v2')))
    const root = createRoot(host)
    act(() => root.render(createElement(Probe)))
    expect(host.textContent).toBe('false')
    act(() => setFlag('library.v2', true))
    expect(host.textContent).toBe('true')
    act(() => root.unmount())
  })
})

describe('preview defaults (F5)', () => {
  const PREVIEW_ON = [
    'foundation.shell',
    'toolbar.v8',
    'settings.v3',
    'notebooks.v2',
    'search.v2',
    'home.v2',
    'library.v2',
    'review.v2',
    'ai.framework',
    'update.v2',
    'page.menus',
    'storage.safety',
  ] as const
  const PREVIEW = 'build-next.learning-notes-app.pages.dev'
  const onHost = (hostname: string) => {
    vi.stubGlobal('location', { hostname, search: '' })
    reloadFlags()
  }
  afterEach(() => {
    vi.unstubAllGlobals()
    reloadFlags()
  })

  it('the build-next preview host starts with the tested parts ON', () => {
    onHost(PREVIEW)
    for (const id of PREVIEW_ON) expect(isOn(id)).toBe(true)
    expect(isOn('textbox.v2')).toBe(false)
    expect(isOn('reader.v2')).toBe(false)
  })

  it('the live host and other hosts keep everything OFF', () => {
    for (const h of [
      'learning-notes-app.pages.dev',
      'localhost',
      `${PREVIEW}.example.com`,
    ]) {
      onHost(h)
      for (const id of FLAG_IDS) expect(isOn(id)).toBe(false)
    }
  })

  it('a switch the user turned OFF stays OFF on the preview host', () => {
    onHost(PREVIEW)
    setFlag('search.v2', false)
    reloadFlags()
    expect(isOn('search.v2')).toBe(false)
    expect(isOn('home.v2')).toBe(true)
  })

  it('a switch the user turned ON is kept on the preview host', () => {
    localStorage.setItem(FLAG_STORAGE_KEY, JSON.stringify(['textbox.v2']))
    onHost(PREVIEW)
    expect(isOn('textbox.v2')).toBe(true)
    expect(isOn('search.v2')).toBe(false)
  })
})
