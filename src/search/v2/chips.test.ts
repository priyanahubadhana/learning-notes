import { describe, expect, it } from 'vitest'
import type { ProFeatureId } from '../../settings/proFeatures.gen'
import { chipList } from './chips'
import { pageLink, resultStripItems } from './strips'

const none = () => false
const only = (id: ProFeatureId) => (x: ProFeatureId) => x === id

describe('chipList (SR-B04, SR-B17, SR-P01, SR-P02)', () => {
  it('Beginner sees All, Pages, Notes, Cards', () => {
    expect(
      chipList({ unlocked: none, libraryOn: true, active: 'all' }),
    ).toEqual(['all', 'page', 'note', 'card'])
  })
  it('with search.moreChips: Tasks and Features; Books and Highlights only if the Library is on', () => {
    const on = only('search.moreChips')
    expect(chipList({ unlocked: on, libraryOn: false, active: 'all' })).toEqual(
      ['all', 'page', 'note', 'card', 'task', 'feature'],
    )
    expect(chipList({ unlocked: on, libraryOn: true, active: 'all' })).toEqual([
      'all',
      'page',
      'note',
      'card',
      'book',
      'highlight',
      'task',
      'feature',
    ])
  })
  it('never lists a chip twice and never hides the chosen Features chip', () => {
    const list = chipList({
      unlocked: none,
      libraryOn: false,
      active: 'feature',
    })
    expect(list).toContain('feature')
    const pro = chipList({
      unlocked: () => true,
      libraryOn: true,
      active: 'feature',
    })
    expect(new Set(pro).size).toBe(pro.length)
  })
})

describe('resultStripItems (SR-B10)', () => {
  it('Open, Copy link, Pin as favourite', () => {
    expect(
      resultStripItems({ pinned: false, canPin: true }).map((i) => i.label),
    ).toEqual(['Open', 'Copy link', 'Pin as favourite'])
  })
  it('reads Remove from favourites when pinned; no pin when it cannot', () => {
    expect(resultStripItems({ pinned: true, canPin: true }).at(-1)?.label).toBe(
      'Remove from favourites',
    )
    expect(resultStripItems({ pinned: false, canPin: false })).toHaveLength(2)
  })
  it('builds the page address', () => {
    expect(
      pageLink('a b', { origin: 'https://x.test', pathname: '/app/' }),
    ).toBe('https://x.test/app/#/page/a%20b')
  })
})
