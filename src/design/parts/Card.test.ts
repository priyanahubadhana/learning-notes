// @vitest-environment jsdom
import { createElement as h } from 'react'
import { act } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Card } from './Card'
import { focusTarget } from './cardPick'
import { placeCard } from './useAnchoredCard'
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
})

describe('Card prefer="above" (a tools row at the bottom, S3-05)', () => {
  const row = { left: 100, top: 700, width: 44, height: 44 }
  const view = { width: 1000, height: 768 }
  const size = { width: 300, height: 200 }

  it('opens above the anchor with the card 8 px clear when there is room', () => {
    const p = placeCard(row, size, view, null, 'above')
    expect(p.side).toBe('above')
    expect(p.top + size.height).toBe(row.top - 8)
  })

  it('without the preference the same card opens below when it fits there', () => {
    const roomy = placeCard({ ...row, top: 100 }, size, view)
    expect(roomy.side).toBe('below')
    const edge = placeCard(row, size, view, null, 'above')
    expect(edge.side).toBe('above')
  })

  it('falls back when there is no room above', () => {
    const p = placeCard({ ...row, top: 20 }, size, view, null, 'above')
    expect(p.side).toBe('below')
  })

  it('the Card passes the preference on: it is drawn on the "above" side', () => {
    mount(
      card({
        placement: 'anchored',
        anchor: row as unknown as HTMLElement,
        prefer: 'above',
      }),
    )
    expect($('[role="dialog"]')?.getAttribute('data-side')).toBe('above')
  })
})
