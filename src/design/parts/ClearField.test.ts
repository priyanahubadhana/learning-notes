// @vitest-environment jsdom
import { createElement as h, useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ClearField } from './ClearField'
import {
  $,
  byLabel,
  click,
  cleanDom,
  key,
  mount,
  type as typeInto,
} from './testHelpers'

afterEach(cleanDom)

function Controlled({ onClear }: { onClear?: () => void }) {
  const [v, setV] = useState('')
  return h(ClearField, {
    'aria-label': 'Search',
    value: v,
    onChange: (e: { target: { value: string } }) => setV(e.target.value),
    onClear,
  })
}

describe('ClearField', () => {
  it('names the clear button after the field', () => {
    mount(h(Controlled))
    expect(byLabel('Clear Search')).not.toBeNull()
  })

  it('clears a controlled field, keeps focus and says "Cleared"', () => {
    const onClear = vi.fn()
    mount(h(Controlled, { onClear }))
    const input = $<HTMLInputElement>('input')!
    typeInto(input, 'hello')
    expect(input.value).toBe('hello')
    click(byLabel('Clear Search'))
    expect(input.value).toBe('')
    expect(onClear).toHaveBeenCalledTimes(1)
    expect(document.activeElement).toBe(input)
    expect($('.clr-live')?.textContent).toBe('Cleared')
  })

  it('Escape clears first when there is text', () => {
    mount(h(Controlled))
    const input = $<HTMLInputElement>('input')!
    typeInto(input, 'abc')
    key(input, 'Escape')
    expect(input.value).toBe('')
  })

  it('Escape with an empty field is left alone for the page', () => {
    mount(h(Controlled))
    const input = $<HTMLInputElement>('input')!
    const e = new KeyboardEvent('keydown', {
      key: 'Escape',
      bubbles: true,
      cancelable: true,
    })
    input.dispatchEvent(e)
    expect(e.defaultPrevented).toBe(false)
  })

  it('has no clear button when disabled or opted out', () => {
    const m = mount(h(ClearField, { 'aria-label': 'Name', disabled: true }))
    expect($('[data-testid="clr-btn"]')).toBeNull()
    m.rerender(
      h(ClearField, {
        'aria-label': 'Name',
        'data-noclr': '',
      } as never),
    )
    expect($('[data-testid="clr-btn"]')).toBeNull()
  })

  it('works for a textarea', () => {
    mount(
      h(ClearField, {
        multiline: true,
        'aria-label': 'Note',
        defaultValue: 'x',
      }),
    )
    expect($('textarea')).not.toBeNull()
    click(byLabel('Clear Note'))
    expect($<HTMLTextAreaElement>('textarea')!.value).toBe('')
  })
})
