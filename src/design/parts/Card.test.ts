// @vitest-environment jsdom
import { createElement as h } from 'react'
import { act } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Card } from './Card'
import { focusTarget } from './cardPick'
import { $, byLabel, click, cleanDom, key, mount } from './testHelpers'

afterEach(() => {
  vi.useRealTimers()
  cleanDom()
})

// The card plays a short closing motion before it tells the caller.
const settle = () => act(() => void vi.advanceTimersByTime(400))

const card = (over: Partial<Parameters<typeof Card>[0]> = {}) =>
  h(
    Card,
    {
      anchor: null,
      size: 'pick',
      title: 'Colour',
      onClose: () => {},
      placement: 'static',
      children: null,
      ...over,
    },
    h('p', null, 'Body text'),
  )

describe('Card', () => {
  it('is a dialog named by its title and shows its content', () => {
    mount(card())
    const d = $('[role="dialog"]')
    expect(d?.getAttribute('aria-label')).toBe('Colour')
    expect(d?.textContent).toContain('Body text')
  })

  it('has a Close button that reports "x"', () => {
    vi.useFakeTimers()
    const onClose = vi.fn()
    mount(card({ onClose }))
    click(byLabel('Close'))
    settle()
    expect(onClose).toHaveBeenCalledWith('x')
  })

  it('shows Back only when a back handler is given', () => {
    const back = vi.fn()
    const m = mount(card())
    expect(byLabel('Back')).toBeNull()
    m.rerender(card({ back }))
    click(byLabel('Back'))
    expect(back).toHaveBeenCalledTimes(1)
  })

  it('shows a skeleton instead of the body while loading', () => {
    mount(card({ loading: true }))
    expect($('.pcard-view')?.getAttribute('aria-busy')).toBe('true')
    expect($('[role="dialog"]')?.textContent).not.toContain('Body text')
  })

  it('closes with "esc" when Escape is pressed inside the anchored card', () => {
    vi.useFakeTimers()
    const onClose = vi.fn()
    mount(card({ placement: 'anchored', onClose }))
    const d = $('[role="dialog"]')
    expect(d).not.toBeNull()
    key(d, 'Escape')
    settle()
    expect(onClose).toHaveBeenCalled()
    expect(onClose.mock.calls[0][0]).toBe('esc')
  })

  it('focuses the Close button, not the card itself, when the body has nothing focusable', () => {
    mount(card())
    const d = $('[role="dialog"]') as HTMLElement
    expect(focusTarget(d)).toBe(byLabel('Close'))
  })

  it('focuses the first control in the body when there is one', () => {
    mount(
      h(
        Card,
        {
          anchor: null,
          size: 'pick',
          title: 'T',
          onClose: () => {},
          placement: 'static',
          children: null,
        },
        h('button', { type: 'button' }, 'Pick me'),
      ),
    )
    expect(focusTarget($('[role="dialog"]') as HTMLElement).textContent).toBe(
      'Pick me',
    )
  })

  // Why: a fast tap into the text right after ✕ was undone 130 ms later when
  // the card handed focus back to its chip, so typed keys went to the chip
  // (CI run 43478875272, the toolbar v8 Copy test).
  it('gives focus back to its chip on ✕ only when the person has not moved on', () => {
    vi.useFakeTimers()
    const chip = document.createElement('button')
    const other = document.createElement('textarea')
    document.body.append(chip, other)
    mount(card({ placement: 'anchored', anchor: chip }))
    click(byLabel('Close'))
    other.focus()
    settle()
    expect(document.activeElement).toBe(other)
    chip.remove()
    other.remove()
  })

  it('still gives focus back to its chip on ✕ when nothing else took it', () => {
    vi.useFakeTimers()
    const chip = document.createElement('button')
    document.body.append(chip)
    mount(card({ placement: 'anchored', anchor: chip }))
    click(byLabel('Close'))
    settle()
    expect(document.activeElement).toBe(chip)
    chip.remove()
  })

  // Why: during the 130 ms closing motion the card still trapped Tab, so a
  // Tab from the chip was pulled back into the closing card and focus was lost
  // when it went away (CI run 43505401817, toolbar v8 Actions chip ring test).
  it('hands focus back to its chip at once on ✕ and stops trapping Tab while it fades', () => {
    vi.useFakeTimers()
    const chip = document.createElement('button')
    document.body.append(chip)
    mount(card({ placement: 'anchored', anchor: chip }))
    click(byLabel('Close'))
    expect(document.activeElement).toBe(chip)
    const tab = new KeyboardEvent('keydown', {
      key: 'Tab',
      bubbles: true,
      cancelable: true,
    })
    act(() => void chip.dispatchEvent(tab))
    expect(tab.defaultPrevented).toBe(false)
    expect(document.activeElement).toBe(chip)
    settle()
    expect(document.activeElement).toBe(chip)
    chip.remove()
  })
})
