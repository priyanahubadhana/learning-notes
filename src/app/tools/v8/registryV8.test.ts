// @vitest-environment jsdom
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { reloadLevel, setLevel, setUnlocked } from '../../../settings/level'
import { Icon } from '../icons'
import { metaOf } from '../toolRegistryMeta'
import { V8_TOOL_IDS, v8Available, v8Icon, v8Tools } from './registryV8'

afterEach(() => {
  localStorage.clear()
  reloadLevel()
})

describe('registryV8', () => {
  it('lists the six tools in bar order', () => {
    expect(v8Tools().map((x) => x.id)).toEqual([...V8_TOOL_IDS])
    expect(V8_TOOL_IDS).toEqual([
      'text',
      'pen',
      'eraser',
      'shapes',
      'lasso',
      'insert',
    ])
  })

  it('reads level, unlock and favourite from the shared meta', () => {
    for (const tool of v8Tools()) {
      const meta = metaOf(tool.id)!
      expect(tool.level).toBe(meta.level)
      expect(tool.favourite).toBe(meta.favourite)
      expect(tool.unlock).toBe(meta.unlock)
    }
    const shapes = v8Tools().find((x) => x.id === 'shapes')!
    expect(shapes.level).toBe('professional')
    expect(shapes.unlock).toBe('tb.shapesAids')
  })

  it('every Professional tool names its unlock switch', () => {
    for (const tool of v8Tools())
      if (tool.level === 'professional') expect(tool.unlock).toBeDefined()
  })

  it('hides a locked tool in Beginner until its switch is on', () => {
    setLevel('beginner')
    const shapes = v8Tools().find((x) => x.id === 'shapes')!
    expect(v8Available(shapes)).toBe(false)
    setUnlocked('tb.shapesAids', true)
    expect(v8Available(shapes)).toBe(true)
    expect(v8Available(v8Tools()[0]!)).toBe(true)
  })

  it('shows every tool in Professional', () => {
    setLevel('professional')
    expect(v8Tools().every(v8Available)).toBe(true)
  })

  it('draws a real icon for every tool', () => {
    for (const tool of v8Tools()) {
      const html = renderToStaticMarkup(
        createElement(Icon, { name: tool.icon }),
      )
      expect(html, `icon of "${tool.id}"`).toContain('<svg')
      expect(tool.icon, `icon of "${tool.id}"`).toBe(metaOf(tool.id)!.icon)
    }
  })

  it('falls back to the neutral icon and warns when an icon is missing', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(v8Icon('x', 'no-such-icon')).toBe('more')
    expect(v8Icon('y', undefined)).toBe('more')
    expect(warn).toHaveBeenCalledTimes(2)
    warn.mockRestore()
  })
})
