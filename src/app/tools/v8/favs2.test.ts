// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import {
  addFav,
  applyFav,
  cleanFavs2,
  currentSetup,
  favIsOn,
  favs2,
  migrateOnce,
  presetsOf,
  removeFav,
  resetRow,
  restoreFav,
  saveFavs,
  toOld,
  withRow,
  MAX_PER_TOOL,
  type Fav2,
} from './favs2'
import { penFavourites } from '../main/penFavourites'
import { activeTool } from '../main/mainTools'
import { penSettings } from '../main/inkSettings'
import { v8Tool } from './barState'

const pen = (id: string, over: Partial<Fav2> = {}): Fav2 => ({
  id,
  tool: 'pen',
  type: 'fountain',
  colour: '#112233',
  size: 2,
  ...over,
})

beforeEach(() => {
  localStorage.clear()
  favs2.clearCache()
  penFavourites.clearCache()
  activeTool.set('pen')
  v8Tool.set('pen')
})

describe('favs2 data', () => {
  it('cleans bad entries, repeated ids and more than six per tool', () => {
    const list = [
      pen('a'),
      pen('a'),
      { id: 'x', tool: 'nope' },
      42,
      ...Array.from({ length: 8 }, (_, i) => pen(`p${i}`)),
    ]
    const out = cleanFavs2(list)!
    expect(out.filter((f) => f.tool === 'pen')).toHaveLength(MAX_PER_TOOL)
    expect(out.map((f) => f.id)).not.toContain('x')
    expect(cleanFavs2('x')).toBeUndefined()
  })

  it('migrates today pen favourites once and leaves the old key alone', () => {
    const old = [
      {
        tool: 'pen',
        type: 'fountain',
        colour: '#112233',
        size: 2,
        exact: null,
      },
      {
        tool: 'highlighter',
        type: null,
        colour: '#ffee00',
        size: 1,
        exact: null,
      },
    ]
    penFavourites.set(old as never)
    migrateOnce()
    expect(favs2.get()).toHaveLength(2)
    expect(favs2.get()[1].hl).toBe(true)
    expect(penFavourites.get()).toEqual(old)
    // The second time nothing is copied again.
    favs2.set([])
    migrateOnce()
    expect(favs2.get()).toEqual([])
  })

  it('keeps the old pen list in step when saving', () => {
    saveFavs([pen('a'), { id: 'e', tool: 'eraser', mode: 'stroke' }])
    expect(penFavourites.get()).toHaveLength(1)
    expect(toOld(favs2.get())[0].type).toBe('fountain')
  })

  it('adds up to six per tool, removes and restores in the same place', () => {
    let list: Fav2[] = []
    for (let i = 0; i < 6; i++) list = addFav(list, pen(`p${i}`)).list
    expect(addFav(list, pen('more')).result).toBe('full')
    expect(addFav(list, { id: 'l', tool: 'lasso' }).result).toBe('added')
    const r = removeFav(list, 'p2')
    expect(r.list.map((f) => f.id)).not.toContain('p2')
    expect(restoreFav(r.list, r.removed!, r.index).map((f) => f.id)).toEqual(
      list.map((f) => f.id),
    )
  })

  it('reorders one row and leaves other tools in place; reset clears one row', () => {
    const list = [pen('a'), { id: 'e', tool: 'eraser' } as Fav2, pen('b')]
    const next = withRow(list, 'pen', [list[2], list[0]])
    expect(next.map((f) => f.id)).toEqual(['b', 'e', 'a'])
    expect(resetRow(list, 'pen').map((f) => f.id)).toEqual(['e'])
  })

  it('keeps only what is ticked and offers presets', () => {
    penSettings.update({ type: 'marker', colour: '#abcdef', size: 0 })
    expect(currentSetup('pen', ['type', 'colour'])).toMatchObject({
      type: 'marker',
      colour: '#abcdef',
    })
    expect(currentSetup('pen', ['type']).colour).toBeUndefined()
    expect(presetsOf('pen').length).toBeGreaterThan(5)
    expect(presetsOf('text')).toEqual([])
  })

  it('applies a whole setup in one step, rings it, and undo puts it back', () => {
    penSettings.update({ type: 'pencil', colour: '#000000', size: 0 })
    const f = pen('a', { type: 'fountain', colour: '#112233', size: 2 })
    expect(favIsOn(f)).toBe(false)
    const undo = applyFav(f)
    expect(penSettings.get()).toMatchObject({ type: 'fountain', size: 2 })
    expect(favIsOn(f)).toBe(true)
    undo()
    expect(penSettings.get()).toMatchObject({ type: 'pencil', size: 0 })
    expect(favIsOn(f)).toBe(false)
  })
})

describe('movedId', () => {
  it('names the one that moved', async () => {
    const { movedId } = await import('./favRow')
    const l = ['a', 'b', 'c', 'd'].map((id) => ({ id }))
    expect(movedId(l, [l[3], l[0], l[1], l[2]])).toBe('d')
    expect(movedId(l, l)).toBeUndefined()
  })
})
