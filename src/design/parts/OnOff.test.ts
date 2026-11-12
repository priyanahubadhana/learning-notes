// @vitest-environment jsdom
import { createElement as h, useState } from 'react'
import { readFileSync } from 'node:fs'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { OnOff, OnOffChoice } from './OnOff'
import { $, $$, byLabel, cleanDom, click, key, mount } from './testHelpers'

afterEach(cleanDom)

function Switch({ onChange }: { onChange?: (v: boolean) => void }) {
  const [on, setOn] = useState(false)
  return h(OnOff, {
    label: 'Show help',
    checked: on,
    onChange: (v: boolean) => {
      setOn(v)
      onChange?.(v)
    },
  })
}

describe('OnOff', () => {
  it('is a labelled switch that toggles on click', () => {
    const spy = vi.fn()
    mount(h(Switch, { onChange: spy }))
    const sw = byLabel('Show help')!
    expect(sw.getAttribute('role')).toBe('switch')
    expect(sw.getAttribute('aria-checked')).toBe('false')
    click(sw)
    expect(sw.getAttribute('aria-checked')).toBe('true')
    expect(spy).toHaveBeenCalledWith(true)
  })

  it('Right turns it on, Left turns it off', () => {
    mount(h(Switch))
    const sw = byLabel('Show help')!
    key(sw, 'ArrowRight')
    expect(sw.getAttribute('aria-checked')).toBe('true')
    key(sw, 'ArrowLeft')
    expect(sw.getAttribute('aria-checked')).toBe('false')
  })

  it('does nothing while disabled', () => {
    const spy = vi.fn()
    mount(
      h(OnOff, { label: 'x', checked: false, onChange: spy, disabled: true }),
    )
    click(byLabel('x'))
    key(byLabel('x'), 'ArrowRight')
    expect(spy).not.toHaveBeenCalled()
  })

  it('keeps a 44 pt hit area and the 52 x 32 drawing in its stylesheet', () => {
    const css = readFileSync('src/design/parts/OnOff.css', 'utf8')
    expect(css).toMatch(/\.onoff\s*{[^}]*min-height:\s*44px/)
    expect(css).toMatch(
      /\.onoff-track\s*{[^}]*width:\s*52px[^}]*height:\s*32px/,
    )
    expect(css).toMatch(/\.onoff-opt\s*{[^}]*min-height:\s*44px/)
    expect(css).not.toMatch(/z-index/)
  })
})

describe('OnOffChoice', () => {
  const options = [
    { value: 'a', label: 'Auto' },
    { value: 'on', label: 'On' },
    { value: 'off', label: 'Off' },
  ]
  function Pick() {
    const [v, setV] = useState('a')
    return h(OnOffChoice<string>, {
      options,
      value: v,
      onChange: setV,
      label: 'Reduce glass',
    })
  }
  const radios = () => $$('[role="radio"]')

  it('is a radio group with one chosen button and one tab stop', () => {
    mount(h(Pick))
    expect(byLabel('Reduce glass')!.getAttribute('role')).toBe('radiogroup')
    expect(radios().map((r) => r.getAttribute('aria-checked'))).toEqual([
      'true',
      'false',
      'false',
    ])
    expect(radios().map((r) => r.tabIndex)).toEqual([0, -1, -1])
  })

  it('chooses on click and with the arrow keys (wraps round)', () => {
    mount(h(Pick))
    click(radios()[2]!)
    expect(radios()[2]!.getAttribute('aria-checked')).toBe('true')
    key($('[role="radiogroup"]'), 'ArrowRight')
    expect(radios()[0]!.getAttribute('aria-checked')).toBe('true')
    key($('[role="radiogroup"]'), 'ArrowLeft')
    expect(radios()[2]!.getAttribute('aria-checked')).toBe('true')
  })
})
