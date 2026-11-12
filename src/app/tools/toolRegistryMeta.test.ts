import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { Icon } from './icons'
import { MAIN_TOOLS } from './main/mainTools'
import { TOOLS } from './toolRegistry'
import { iconOf, TOOL_META } from './toolRegistryMeta'

const have = new Set(Object.keys(TOOL_META))
const wanted = [...new Set([...TOOLS.map((t) => t.id), ...MAIN_TOOLS])]

describe('tool registry meta', () => {
  it.each(wanted)('has an entry for %s', (id) => {
    expect(
      have.has(id),
      `toolRegistryMeta.ts is missing the tool "${id}"`,
    ).toBe(true)
  })

  it('has no entry for a tool that does not exist', () => {
    for (const id of have) {
      expect(
        wanted.includes(id),
        `toolRegistryMeta.ts lists "${id}", which is in neither TOOLS nor MAIN_TOOLS`,
      ).toBe(true)
    }
  })

  it('draws every icon', () => {
    for (const [id, meta] of Object.entries(TOOL_META)) {
      const html = renderToStaticMarkup(
        createElement(Icon, { name: meta.icon }),
      )
      expect(html, `icon of "${id}"`).toContain('<svg')
    }
  })

  it('gives unknown ids the "more" icon, and known ids their own', () => {
    expect(iconOf('nope')).toBe('more')
    expect(iconOf('__proto__')).toBe('more')
    expect(iconOf('toString')).toBe('more')
    expect(iconOf('pen')).toBe('penTool')
  })

  it('has an unlock switch for every Professional tool, and only those', () => {
    for (const [id, meta] of Object.entries(TOOL_META)) {
      if (meta.level === 'professional') {
        expect(meta.unlock, `"${id}" is Professional`).toMatch(/^[a-z]+\.\w+/i)
      } else {
        expect(meta.unlock, `"${id}" is Beginner`).toBeUndefined()
      }
      expect(meta.places.length, `places of "${id}"`).toBeGreaterThan(0)
    }
  })
})
