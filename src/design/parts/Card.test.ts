// @vitest-environment jsdom
import { createElement as h } from 'react'
import { act } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Card } from './Card'
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
})
