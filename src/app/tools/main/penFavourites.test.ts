// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { highlighterSettings, penSettings } from './inkSettings'
import {
  MAX_FAVOURITES,
  addFavourite,
  applyFavourite,
  cleanFavourites,
  currentFavourite,
  favouritesOf,
  isCurrent,
  removeFavourite,
  type Favourite,
} from './penFavourites'

const pen = (colour: string, size: 0 | 1 | 2 = 1): Favourite => ({
  tool: 'pen',
  type: 'fountain',
  colour,
  size,
  exact: null,
})

beforeEach(() => {
  localStorage.clear()
  penSettings.reset()
  highlighterSettings.reset()
})

describe('pen favourites', () => {
  it('saves in order, ignores a repeat, and stops at six per tool', () => {
    let list: Favourite[] = []
    for (let i = 0; i < MAX_FAVOURITES; i++) {
      const r = addFavourite(list, pen(`#00000${i}`))
      expect(r.result).toBe('added')
      list = r.list
    }
    expect(list.map((f) => f.colour)).toEqual([
      '#000000',
      '#000001',
      '#000002',
      '#000003',
      '#000004',
      '#000005',
    ])
    expect(addFavourite(list, pen('#000000')).result).toBe('same')
    expect(addFavourite(list, pen('#ff0000')).result).toBe('full')
    // The highlighter has its own six.
    const hl: Favourite = {
      tool: 'highlighter',
      type: null,
      colour: '#ffee00',
      size: 1,
      exact: null,
    }
    expect(addFavourite(list, hl).result).toBe('added')
  })

  it('removes one and keeps the order of the rest', () => {
    const list = [pen('#111111'), pen('#222222'), pen('#333333')]
    expect(removeFavourite(list, pen('#222222')).map((f) => f.colour)).toEqual([
      '#111111',
      '#333333',
    ])
  })

  it('red fine pen, blue, tap the favourite: red fine again', () => {
    penSettings.update({ type: 'ball', colour: '#d92d20', size: 0 })
    const red = currentFavourite('pen')
    penSettings.update({ colour: '#1d4ed8', size: 2 })
    expect(isCurrent(red)).toBe(false)
    applyFavourite(red)
    expect(penSettings.get()).toMatchObject({
      type: 'ball',
      colour: '#d92d20',
      size: 0,
    })
    expect(isCurrent(red)).toBe(true)
  })

  it('a highlighter favourite sets colour and size only', () => {
    highlighterSettings.update({ colour: '#ffee00', size: 2 })
    const fav = currentFavourite('highlighter')
    highlighterSettings.update({ colour: '#00ff88', size: 0 })
    applyFavourite(fav)
    expect(highlighterSettings.get()).toMatchObject({
      colour: '#ffee00',
      size: 2,
    })
    expect(favouritesOf([fav, pen('#111111')], 'highlighter')).toEqual([fav])
  })

  it('cleans a pulled list: bad entries and repeats drop out', () => {
    const cleaned = cleanFavourites([
      pen('#111111'),
      pen('#111111'),
      { tool: 'pen', type: 'nope', colour: '#111111', size: 1 },
      { tool: 'pen', type: 'fountain', colour: 'red', size: 1 },
      'x',
    ])
    expect(cleaned).toEqual([pen('#111111')])
    expect(cleanFavourites('nope')).toBeUndefined()
  })
})
