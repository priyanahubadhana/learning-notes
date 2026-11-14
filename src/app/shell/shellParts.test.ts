// @vitest-environment jsdom
import { createElement as h } from 'react'
import { act } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  $,
  $$,
  byLabel,
  click,
  cleanDom,
  key,
  mount,
} from '../../design/parts/testHelpers'
import { overlay } from '../overlay'
import { Dialog } from './Dialog'
import { FloatingBar } from './FloatingBar'
import {
  clampAt,
  edgePlace,
  minimisedBars,
  minimiseBar,
  minimiseUsed,
  restoreBar,
  snapSide,
} from './minimise'
import { MoreSheet } from './MoreSheet'
import { PopMenu } from './PopMenu'
import { popPosition } from './popPosition'
import { createShellToasts } from './toastStore'

// jsdom hides a closed popover and cannot focus inside it; the real top layer is open.
const style = document.createElement('style')
style.textContent = '[popover] { display: block !important; }'
document.head.appendChild(style)

afterEach(() => {
  cleanDom()
  document.querySelectorAll('[data-chip-layer]').forEach((n) => n.remove())
  minimisedBars.set([])
  minimiseUsed.set(false)
  edgePlace.set({ side: 'right', at: 0.4 })
  vi.useRealTimers()
})

const noop = () => {}

describe('Dialog (SH-10)', () => {
  const props = (over = {}) => ({
    title: 'Delete this page?',
    confirmLabel: 'Delete',
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
    ...over,
  })

  it('has a title, ✕, Cancel and one action', () => {
    mount(h(Dialog, props()))
    const d = $('[role="dialog"]')
    expect(d?.getAttribute('aria-modal')).toBe('true')
    expect(d?.textContent).toContain('Delete this page?')
    expect(byLabel('Close')).not.toBeNull()
    expect($$('.sh-dialog-foot button').map((b) => b.textContent)).toEqual([
      'Cancel',
      'Delete',
    ])
  })

  it('a destructive action is red and says "You can undo this."', () => {
    mount(h(Dialog, props({ destructive: true })))
    expect($('.sh-btn-danger')?.textContent).toBe('Delete')
    expect($('.sh-dialog-undo')?.textContent).toBe('You can undo this.')
  })

  it('Enter in a field confirms; Esc cancels', () => {
    const p = props()
    mount(h(Dialog, { ...p }, h('input', { 'data-autofocus': '' })))
    expect(document.activeElement?.tagName).toBe('INPUT')
    key($('input'), 'Enter')
    expect(p.onConfirm).toHaveBeenCalledTimes(1)
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    })
    expect(p.onCancel).toHaveBeenCalledTimes(1)
  })

  it('Enter does not confirm while the action is disabled', () => {
    const p = props({ confirmDisabled: true })
    mount(h(Dialog, { ...p }, h('input')))
    key($('input'), 'Enter')
    expect(p.onConfirm).not.toHaveBeenCalled()
  })

  it('taking the dialog away is not a Cancel', () => {
    const p = props()
    const view = mount(h(Dialog, p))
    view.unmount()
    expect(p.onCancel).not.toHaveBeenCalled()
  })

  it('registers on the dialog layer and leaves when closed', () => {
    const view = mount(h(Dialog, props()))
    expect(overlay.count()).toBe(1)
    view.unmount()
    expect(overlay.count()).toBe(0)
  })
})

describe('PopMenu (SH-11)', () => {
  it('opens below the button; flips above near the bottom; stays on screen', () => {
    const view = { width: 400, height: 600 }
    const size = { width: 220, height: 200 }
    const low = { left: 10, top: 100, width: 40, height: 44 }
    expect(popPosition(low, size, view)).toMatchObject({
      top: 148,
      flipped: false,
    })
    const bottom = { left: 380, top: 540, width: 40, height: 44 }
    const p = popPosition(bottom, size, view)
    expect(p.flipped).toBe(true)
    expect(p.top).toBe(540 - 4 - 200)
    expect(p.left).toBe(400 - 8 - 220)
  })

  it('has rows with role menuitem, arrows move, Enter picks and closes', () => {
    const picked = vi.fn()
    const onClose = vi.fn()
    mount(
      h(PopMenu, {
        anchor: document.body,
        label: 'Page actions',
        onClose,
        sections: [
          {
            items: [
              { id: 'a', label: 'Rename', onPick: picked },
              { id: 'b', label: 'Move', onPick: noop },
            ],
          },
          { items: [{ id: 'c', label: 'Delete', danger: true, onPick: noop }] },
        ],
      }),
    )
    expect($('[role="menu"]')?.getAttribute('aria-label')).toBe('Page actions')
    const rows = $$('[role="menuitem"]')
    expect(rows).toHaveLength(3)
    expect(document.activeElement).toBe(rows[0])
    key(rows[0], 'ArrowDown')
    expect(document.activeElement).toBe(rows[1])
    key(rows[1], 'ArrowUp')
    expect(document.activeElement).toBe(rows[0])
    expect($('.sh-pop-div')).not.toBeNull()
    expect(rows[2].hasAttribute('data-danger')).toBe(true)
    click(rows[0])
    expect(picked).toHaveBeenCalled()
    expect(onClose).toHaveBeenCalled()
  })
})

describe('Toast (SH-12)', () => {
  it('shows one at a time: a second replaces the first', () => {
    const t = createShellToasts({ set: () => 0, clear: noop })
    t.show('First')
    t.show('Second')
    expect(t.current()?.message).toBe('Second')
  })

  it('closes after the app’s time rule: 6 s at least with Undo, shorter without', () => {
    vi.useFakeTimers()
    const t = createShellToasts()
    t.show('Saved')
    vi.advanceTimersByTime(2400)
    expect(t.current()).not.toBeNull()
    vi.advanceTimersByTime(200)
    expect(t.current()).toBeNull()
    t.show('Page deleted', { label: 'Undo', onSelect: noop })
    vi.advanceTimersByTime(5900)
    expect(t.current()).not.toBeNull()
    vi.advanceTimersByTime(3000)
    expect(t.current()).toBeNull()
  })

  it('runs the stored undo and closes', () => {
    const undo = vi.fn()
    const t = createShellToasts()
    t.show('Page deleted', { label: 'Undo', onSelect: undo })
    t.undo()
    expect(undo).toHaveBeenCalledTimes(1)
    expect(t.current()).toBeNull()
  })

  it('hovering holds it; 1.5 s after release it closes', () => {
    vi.useFakeTimers()
    const t = createShellToasts()
    t.show('Saved')
    t.hold()
    vi.advanceTimersByTime(20_000)
    expect(t.current()).not.toBeNull()
    t.release()
    vi.advanceTimersByTime(1400)
    expect(t.current()).not.toBeNull()
    vi.advanceTimersByTime(200)
    expect(t.current()).toBeNull()
  })
})

describe('MoreSheet (SH-09)', () => {
  const sheet = (over = {}) => ({
    title: 'Notebook options',
    sub: 'Biology',
    tabs: [
      { id: 'a', label: 'Look' },
      { id: 'b', label: 'Pages' },
    ],
    tab: 'a',
    onTab: vi.fn(),
    setKey: 'test-more',
    hint: 'Nothing changes until Done',
    onDone: vi.fn(),
    onClose: vi.fn(),
    ...over,
  })

  it('has header, tabs, a body and a Cancel / Done footer', () => {
    mount(h(MoreSheet, sheet(), h('p', {}, 'Body')))
    expect($('[data-testid="more-sheet"] h2')?.textContent).toBe(
      'Notebook options',
    )
    expect($('.sh-sheet-tt p')?.textContent).toBe('Biology')
    expect($('[data-testid="more-body"]')?.textContent).toBe('Body')
    expect($('.sh-sheet-hint')?.textContent).toBe('Nothing changes until Done')
    expect($('[data-testid="more-done"]')?.textContent).toContain('Done')
  })

  it('Done calls onDone; Cancel closes at once when nothing was edited', () => {
    const p = sheet()
    mount(h(MoreSheet, p, h('p', {}, 'Body')))
    click($('[data-testid="more-done"]'))
    expect(p.onDone).toHaveBeenCalled()
    click(
      $$('.sh-sheet-foot .sh-btn').find((b) => b.textContent === 'Cancel') ??
        null,
    )
    expect(p.onClose).toHaveBeenCalledTimes(1)
  })

  it('with edits, Cancel asks "Discard changes?" first', () => {
    const p = sheet({ dirty: true })
    mount(h(MoreSheet, p, h('p', {}, 'Body')))
    click(
      $$('.sh-sheet-foot .sh-btn').find((b) => b.textContent === 'Cancel') ??
        null,
    )
    expect(p.onClose).not.toHaveBeenCalled()
    expect($('.sh-dialog-title')?.textContent).toBe('Discard changes?')
    click($('.sh-btn-danger'))
    expect(p.onClose).toHaveBeenCalledTimes(1)
  })

  it('Esc with edits asks too, and "Keep editing" keeps the sheet', () => {
    const p = sheet({ dirty: true })
    mount(h(MoreSheet, p, h('p', {}, 'Body')))
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    })
    expect($('.sh-dialog-title')?.textContent).toBe('Discard changes?')
    click(
      $$('.sh-dialog-foot .sh-btn').find(
        (b) => b.textContent === 'Keep editing',
      ) ?? null,
    )
    expect($('.sh-dialog')).toBeNull()
    expect($('[data-testid="more-sheet"]')).not.toBeNull()
    expect(p.onClose).not.toHaveBeenCalled()
  })

  it('resets the body to the top when the tab changes', () => {
    const p = sheet()
    const view = mount(h(MoreSheet, p, h('p', {}, 'Body')))
    const body = $('[data-testid="more-body"]')!
    body.scrollTop = 120
    view.rerender(h(MoreSheet, { ...p, tab: 'b' }, h('p', {}, 'Other')))
    expect(body.scrollTop).toBe(0)
  })
})

describe('Floating bar, chip and edge handle (SH-13)', () => {
  it('a bar has a separator and a minimise button; minimising makes a chip with the label', () => {
    mount(
      h(FloatingBar, { id: 'reader', label: 'Reader bar' }, h('i', {}, 'x')),
    )
    expect($('.sh-fbar-sep')).not.toBeNull()
    click($('[data-testid="bar-minimise"]'))
    expect($('[data-testid="floating-bar"]')).toBeNull()
    const chip = $('[data-testid="minimise-chip"]')
    expect(chip?.textContent).toContain('Reader bar')
    expect(chip?.getAttribute('aria-label')).toBe(
      'Show Reader bar (drag to move)',
    )
  })

  it('each bar minimises and restores on its own', () => {
    mount(
      h('div', {}, [
        h(FloatingBar, { key: 'a', id: 'reader', label: 'Reader bar' }, 'a'),
        h(FloatingBar, { key: 'b', id: 'draw', label: 'Drawing bar' }, 'b'),
      ]),
    )
    click($('[data-bar="reader"] [data-testid="bar-minimise"]'))
    click($('[data-bar="draw"] [data-testid="bar-minimise"]'))
    expect($$('[data-testid="minimise-chip"]')).toHaveLength(2)
    click($$('[data-testid="minimise-chip"]')[0])
    expect($$('[data-testid="minimise-chip"]')).toHaveLength(1)
    expect($('[data-bar="reader"]')).not.toBeNull()
    expect($('[data-bar="draw"]')).toBeNull()
  })

  it('remembers which bars are minimised', () => {
    minimiseBar('reader')
    expect(minimisedBars.get()).toEqual(['reader'])
    expect(minimiseUsed.get()).toBe(true)
    restoreBar('reader')
    expect(minimisedBars.get()).toEqual([])
  })

  it('pulses the minimise button after 45 s, then every 3 minutes, until it was used', () => {
    vi.useFakeTimers()
    mount(h(FloatingBar, { id: 'reader', label: 'Reader bar' }, 'a'))
    const bar = () => $('[data-testid="floating-bar"]')
    expect(bar()?.hasAttribute('data-pulse')).toBe(false)
    act(() => {
      vi.advanceTimersByTime(45_000)
    })
    expect(bar()?.hasAttribute('data-pulse')).toBe(true)
    act(() => {
      vi.advanceTimersByTime(2_400)
    })
    expect(bar()?.hasAttribute('data-pulse')).toBe(false)
    act(() => {
      vi.advanceTimersByTime(180_000)
    })
    expect(bar()?.hasAttribute('data-pulse')).toBe(true)
  })

  it('the edge handle snaps to the nearest side and stays inside the window', () => {
    expect(snapSide(100, 1000)).toBe('left')
    expect(snapSide(600, 1000)).toBe('right')
    expect(clampAt(-1)).toBe(0.08)
    expect(clampAt(2)).toBe(0.92)
  })
})
