// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { MODE_TOOLS } from '../app/tools/main/mainTools'
import { applyPageMode, editableIn, pageMode, pageModeFor } from './editPolicy'

describe('pageModeFor', () => {
  for (const tool of MODE_TOOLS) {
    it(`${tool}: frozen wins, then reading`, () => {
      expect(pageModeFor({ tool, frozen: true, reading: false })).toBe('frozen')
      expect(pageModeFor({ tool, frozen: true, reading: true })).toBe('frozen')
      expect(pageModeFor({ tool, frozen: false, reading: true })).toBe('read')
    })
  }
  it('maps the tools', () => {
    const f = { frozen: false, reading: false }
    expect(pageModeFor({ tool: 'text', ...f })).toBe('edit')
    expect(pageModeFor({ tool: 'lasso', ...f })).toBe('select')
    for (const tool of ['pen', 'highlighter', 'eraser'] as const)
      expect(pageModeFor({ tool, ...f })).toBe('ink')
  })
})

describe('applyPageMode', () => {
  const make = () => {
    const content = document.createElement('div')
    content.contentEditable = 'true'
    const input = document.createElement('input')
    content.append(input)
    document.body.append(content)
    const title = document.createElement('input')
    return { editor: { isEditable: true }, content, title }
  }
  it('ink: not editable, inert, title read-only, focus released', () => {
    const el = make()
    el.content.querySelector('input')!.focus()
    applyPageMode('ink', el)
    expect(el.editor.isEditable).toBe(false)
    expect(el.content.hasAttribute('inert')).toBe(true)
    expect(el.title.readOnly).toBe(true)
    expect(el.content.contains(document.activeElement)).toBe(false)
    expect(pageMode.get()).toBe('ink')
  })
  it('edit restores everything', () => {
    const el = make()
    applyPageMode('ink', el)
    applyPageMode('edit', el)
    expect(el.editor.isEditable).toBe(true)
    expect(el.content.hasAttribute('inert')).toBe(false)
    expect(el.title.readOnly).toBe(false)
    expect(editableIn('read')).toBe(false)
    expect(editableIn('frozen')).toBe(false)
  })
})
