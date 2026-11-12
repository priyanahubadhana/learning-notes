// @vitest-environment jsdom
import { createElement as h } from 'react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { $, $$, click, cleanDom, mount } from '../../design/parts/testHelpers'
import { getLevel, setLevel } from '../../settings/level'
import { ViewToggle } from './ViewToggle'
import { modeOf } from './views'

beforeEach(() => setLevel('professional'))
afterEach(cleanDom)

describe('ViewToggle (SH-06)', () => {
  it('has two buttons, Beginner and Professional, one pressed', () => {
    mount(h(ViewToggle))
    const b = $$<HTMLButtonElement>('[data-testid="view-toggle"] button')
    expect(b.map((x) => x.textContent)).toEqual(['Beginner', 'Professional'])
    expect(b.map((x) => x.getAttribute('aria-pressed'))).toEqual([
      'false',
      'true',
    ])
  })

  it('writes the app level when pressed', () => {
    mount(h(ViewToggle))
    click($('[data-view="beginner"]'))
    expect(getLevel()).toBe('beginner')
    click($('[data-view="professional"]'))
    expect(getLevel()).toBe('professional')
  })

  it('takes other views by props', () => {
    mount(
      h(ViewToggle, {
        views: [{ id: 'beginner', label: 'Simple' }],
      }),
    )
    expect($('[data-view="beginner"]')?.textContent).toBe('Simple')
  })

  it('maps the level to data-mode', () => {
    expect(modeOf('beginner')).toBe('beg')
    expect(modeOf('professional')).toBe('pro')
  })
})
