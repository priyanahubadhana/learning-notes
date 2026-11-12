import { describe, expect, it } from 'vitest'
import { crumbsFor } from './crumbs'

describe('crumbsFor (SH-04)', () => {
  it('makes the space a button and the screen name the plain last crumb', () => {
    expect(crumbsFor('notebooks', 'Notebooks', 'Biology / Cells')).toEqual([
      { label: 'Notebooks', space: 'notebooks' },
      { label: 'Biology / Cells' },
    ])
  })
  it('shows only the space, as plain text, when the screen has no name', () => {
    expect(crumbsFor('home', 'Home', null)).toEqual([{ label: 'Home' }])
    expect(crumbsFor('home', 'Home', '  ')).toEqual([{ label: 'Home' }])
  })
  it('keeps the space a button while a page is open (the page adds its own path)', () => {
    expect(crumbsFor('notebooks', 'Notebooks', null, true)).toEqual([
      { label: 'Notebooks', space: 'notebooks' },
    ])
  })
  it('does not repeat the space name', () => {
    expect(crumbsFor('review', 'Review', 'Review')).toEqual([
      { label: 'Review' },
    ])
  })
})
