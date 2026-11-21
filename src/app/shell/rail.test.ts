// @vitest-environment jsdom
import { createElement as h } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  $,
  $$,
  byLabel,
  click,
  cleanDom,
  mount,
} from '../../design/parts/testHelpers'
import { Rail, type SpaceNavProps } from './Rail'
import { TabBar } from './TabBar'
import { flipTheme, themeIcon } from './theme'
import { badgeText } from './useDue'

// The gear menu has its own tests; here it is only a button.
vi.mock('./GearMenu', () => ({
  GearMenu: ({
    trigger,
  }: {
    trigger: (p: { open: boolean; onClick: () => void }) => unknown
  }) => trigger({ open: false, onClick: () => {} }),
}))

afterEach(cleanDom)

const gear = {
  theme: 'night',
  onTheme: vi.fn(),
} as unknown as SpaceNavProps['gear']

const props = (over: Partial<SpaceNavProps> = {}): SpaceNavProps => ({
  spaces: ['home', 'library', 'notebooks', 'review'],
  current: 'notebooks',
  onSelect: vi.fn(),
  due: 17,
  gear,
  ...over,
})

describe('Rail (SH-02)', () => {
  it('is the Spaces navigation with the four spaces in the app order', () => {
    mount(h(Rail, props()))
    expect(byLabel('Spaces')?.tagName).toBe('NAV')
    expect($$('[data-space]').map((b) => b.dataset.space)).toEqual([
      'home',
      'library',
      'notebooks',
      'review',
    ])
  })

  it('marks the current space with aria-current="page"', () => {
    mount(h(Rail, props()))
    expect($('[data-space="notebooks"]')?.getAttribute('aria-current')).toBe(
      'page',
    )
    expect($('[data-space="home"]')?.getAttribute('aria-current')).toBeNull()
  })

  it('does not draw a hidden space (Notebooks always stays)', () => {
    mount(h(Rail, props({ spaces: ['notebooks'] })))
    expect($$('[data-space]')).toHaveLength(1)
  })

  it('shows the due count on Review and says it in words', () => {
    mount(h(Rail, props()))
    const badge = $('[data-space="review"] .sh-badge')
    expect(badge?.textContent).toBe('17')
    expect(badge?.getAttribute('aria-label')).toBe('17 cards due')
  })

  it('shows no badge when nothing is due', () => {
    mount(h(Rail, props({ due: 0 })))
    expect($('.sh-badge')).toBeNull()
  })

  it('selects a space on tap', () => {
    const p = props()
    mount(h(Rail, p))
    click($('[data-space="library"]'))
    expect(p.onSelect).toHaveBeenCalledWith('library')
  })

  it('has a Day/Night button that flips the theme in one tap', () => {
    mount(h(Rail, props()))
    click(byLabel('Switch to Day'))
    expect(gear.onTheme).toHaveBeenCalledWith('day')
  })

  it('ends with the gear button', () => {
    mount(h(Rail, props()))
    const all = $$('button')
    expect(all[all.length - 1]?.getAttribute('data-testid')).toBe(
      'corner-button',
    )
  })
})

describe('TabBar (SH-03)', () => {
  it('has the four spaces and More, with a label under each icon', () => {
    mount(h(TabBar, props()))
    expect($$('.sh-tab')).toHaveLength(5)
    expect($$('.sh-tablbl').map((l) => l.textContent)).toEqual([
      'Home',
      'Library',
      'Notebooks',
      'Review',
      'More',
    ])
  })

  it('marks the current space and shows the badge beside the icon', () => {
    mount(h(TabBar, props()))
    expect($('[data-space="notebooks"]')?.getAttribute('aria-current')).toBe(
      'page',
    )
    expect($('[data-space="review"] .sh-badge')?.textContent).toBe('17')
  })
})

describe('theme helpers', () => {
  it('flips Day and Night; Sepia goes to Night', () => {
    expect(flipTheme('night')).toBe('day')
    expect(flipTheme('day')).toBe('night')
    expect(flipTheme('sepia')).toBe('night')
    expect(themeIcon('night')).toBe('sun')
    expect(themeIcon('day')).toBe('moon')
  })
  it('caps the badge at 99+', () => {
    expect(badgeText(7)).toBe('7')
    expect(badgeText(100)).toBe('99+')
  })
})
