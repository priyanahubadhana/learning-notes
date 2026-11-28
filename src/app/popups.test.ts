/**
 * @vitest-environment jsdom
 */
import { act, createElement as h, useState } from 'react'
import { createPortal } from 'react-dom'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { setPressHome } from './input/pressHome'
import { SCROLL_GRACE_MS, openPopupCount, usePopup } from './popups'

;(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true

/** A pop-up that is shown while open; `name` tells the two apart. */
function Pop({ name }: { name: string }) {
  const [open, setOpen] = useState(false)
  usePopup(
    open,
    () => setOpen(false),
    (el) => el.closest(`#${name}-panel`) !== null,
  )
  return h(
    'div',
    null,
    h(
      'button',
      {
        id: `${name}-open`,
        'data-popup-trigger': true,
        onClick: () => setOpen(!open),
      },
      'open',
    ),
    open
      ? h(
          'div',
          { id: `${name}-panel` },
          h('button', { id: `${name}-item` }, 'item'),
        )
      : null,
  )
}

let host: HTMLDivElement
let root: Root
const q = (selector: string) => document.querySelector(selector)
const click = (selector: string) =>
  act(() => {
    const el = q(selector) as HTMLElement
    el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
    el.click()
  })
const open = (name: string) => q(`#${name}-panel`) !== null

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  act(() => {
    root.render(
      h(
        'div',
        null,
        h(Pop, { name: 'a' }),
        h(Pop, { name: 'b' }),
        h('button', { id: 'outside' }, 'outside'),
      ),
    )
  })
})
afterEach(() => {
  act(() => root.unmount())
  host.remove()
  vi.useRealTimers()
})

/** A parent pop-up with a child menu opened from inside it, drawn on the body. */
function Family() {
  const [parent, setParent] = useState(false)
  const [child, setChild] = useState<Element | null>(null)
  usePopup(
    parent,
    () => setParent(false),
    (el) => el.closest('#parent-panel') !== null,
  )
  usePopup(
    child !== null,
    () => setChild(null),
    (el) => el.closest('#child-panel') !== null,
    { opener: child },
  )
  return h(
    'div',
    null,
    h(
      'button',
      {
        id: 'parent-open',
        'data-popup-trigger': true,
        onClick: () => setParent(!parent),
      },
      'p',
    ),
    parent
      ? h(
          'div',
          { id: 'parent-panel' },
          h(
            'button',
            {
              id: 'child-open',
              'data-popup-trigger': true,
              onClick: (e: { currentTarget: Element }) =>
                setChild(child ? null : e.currentTarget),
            },
            'c',
          ),
        )
      : null,
    child
      ? createPortal(
          h(
            'div',
            { id: 'child-panel' },
            h('button', { id: 'child-item' }, 'x'),
          ),
          document.body,
        )
      : null,
  )
}

describe('a pop-up opened from inside another one', () => {
  beforeEach(() => {
    act(() => {
      root.render(
        h('div', null, h(Family), h('button', { id: 'outside' }, 'outside')),
      )
    })
  })

  it('does not close the pop-up it belongs to; both close on a tap outside; Esc closes the child first', () => {
    click('#parent-open')
    click('#child-open')
    expect(open('parent')).toBe(true)
    expect(open('child')).toBe(true)
    expect(openPopupCount()).toBe(2)
    // A tap inside the child is not a tap outside the parent.
    click('#child-item')
    expect(open('parent')).toBe(true)
    expect(open('child')).toBe(true)
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    })
    expect(open('child')).toBe(false)
    expect(open('parent')).toBe(true)
    click('#child-open')
    click('#outside')
    expect(open('child')).toBe(false)
    expect(open('parent')).toBe(false)
    expect(openPopupCount()).toBe(0)
  })
})

describe('the one pop-up rule', () => {
  it('stays open for taps inside it and for its own button; closes on a tap outside', () => {
    click('#a-open')
    expect(open('a')).toBe(true)
    click('#a-item')
    expect(open('a')).toBe(true)
    click('#outside')
    expect(open('a')).toBe(false)
    expect(openPopupCount()).toBe(0)
  })

  it('its own button toggles it (a press is not an "outside" tap)', () => {
    click('#a-open')
    click('#a-open')
    expect(open('a')).toBe(false)
  })

  it('Esc closes it', () => {
    click('#a-open')
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    })
    expect(open('a')).toBe(false)
  })

  it('opening another pop-up closes the first: only one is open', () => {
    click('#a-open')
    click('#b-open')
    expect(open('a')).toBe(false)
    expect(open('b')).toBe(true)
    expect(openPopupCount()).toBe(1)
  })

  it('a scroll closes it, but not the page settling just after it opened', () => {
    click('#a-open')
    act(() => {
      document.dispatchEvent(new Event('scroll'))
    })
    expect(open('a')).toBe(true)
    vi.setSystemTime(Date.now() + SCROLL_GRACE_MS + 50)
    // Scrolling inside the pop-up itself is not the page scrolling.
    act(() => {
      q('#a-item')!.dispatchEvent(new Event('scroll', { bubbles: false }))
    })
    expect(open('a')).toBe(true)
    // A scroll the page makes by itself (no wheel, touch or key) is not the user.
    act(() => {
      document.dispatchEvent(new Event('scroll'))
    })
    expect(open('a')).toBe(true)
    act(() => {
      document.dispatchEvent(new Event('wheel'))
      document.dispatchEvent(new Event('scroll'))
    })
    expect(open('a')).toBe(false)
  })

  it('a space typed in the text is typing, not scrolling: a scroll after it keeps it open', () => {
    // CI run 46106138514 (handwritingChooser, chromium): words typed with
    // spaces, then Insert tapped within 1.2 s on a bar that had to scroll to
    // show it; the bar's scroll came after the tap and closed the new pill.
    const text = document.createElement('div')
    text.contentEditable = 'true'
    document.body.append(text)
    click('#a-open')
    vi.setSystemTime(Date.now() + SCROLL_GRACE_MS + 50)
    act(() => {
      text.dispatchEvent(
        new KeyboardEvent('keydown', { key: ' ', bubbles: true }),
      )
      document.dispatchEvent(new Event('scroll'))
    })
    expect(open('a')).toBe(true)
    // A space on the page itself (not in a text) still scrolls it.
    act(() => {
      document.body.dispatchEvent(
        new KeyboardEvent('keydown', { key: ' ', bubbles: true }),
      )
      document.dispatchEvent(new Event('scroll'))
    })
    expect(open('a')).toBe(false)
    text.remove()
  })

  it('navigating (the address changes, or Back) closes it', () => {
    click('#a-open')
    act(() => {
      window.dispatchEvent(new Event('hashchange'))
    })
    expect(open('a')).toBe(false)
    click('#a-open')
    act(() => {
      window.dispatchEvent(new Event('popstate'))
    })
    expect(open('a')).toBe(false)
  })
})

// P1.5 (first look L11): the scroll bar of a menu's list is drawn on the page
// body, outside the menu. Pressing it closed the menu ("a tap outside").
describe('a part drawn outside its pop-up (its scroll bar)', () => {
  it('a press on it is a press inside the pop-up; without a home it is outside', () => {
    click('#a-open')
    const bar = document.createElement('div')
    bar.append(document.createElement('span'))
    document.body.append(bar)
    const forget = setPressHome(bar, q('#a-item') as Element)
    act(() => {
      bar.firstElementChild!.dispatchEvent(
        new PointerEvent('pointerdown', { bubbles: true }),
      )
    })
    expect(open('a')).toBe(true)
    forget()
    act(() => {
      bar.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
    })
    expect(open('a')).toBe(false)
    bar.remove()
  })
})
