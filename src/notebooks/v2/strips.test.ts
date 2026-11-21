import { describe, expect, it } from 'vitest'
import type { ProFeatureId } from '../../settings/proFeatures.gen'
import { notebookStripItems, type NotebookStripInput } from './strips'

const base: NotebookStripInput = {
  starred: false,
  coverIsPage: false,
  unlocked: () => false,
  canMoveUp: true,
  canMoveDown: true,
}
const ids = (i: Partial<NotebookStripInput> = {}) =>
  notebookStripItems({ ...base, ...i }).map((x) => x.id)

describe('notebookStripItems (NB-B08, NB-P03, NB-P05..P07)', () => {
  it('Beginner: Open, Pin, Rename, Cover, then Delete (red) last', () => {
    expect(ids()).toEqual(['open', 'pin', 'rename', 'cover', 'delete'])
    const items = notebookStripItems(base)
    const last = items[items.length - 1]
    expect(last.danger).toBe(true)
    expect(items.filter((i) => i.danger)).toHaveLength(1)
  })

  it('Pin reads Unpin when the notebook is pinned', () => {
    const items = notebookStripItems({ ...base, starred: true })
    expect(items.find((i) => i.id === 'pin')?.label).toBe('Unpin')
    expect(notebookStripItems(base).find((i) => i.id === 'pin')?.label).toBe(
      'Pin to the top',
    )
  })

  it('each Professional item needs its own switch', () => {
    const only = (id: ProFeatureId) => (x: ProFeatureId) => x === id
    expect(ids({ unlocked: only('nb.addEmptyPage') })).toContain('addPage')
    expect(ids({ unlocked: only('nb.addEmptyPage') })).not.toContain(
      'addTemplate',
    )
    expect(ids({ unlocked: only('nb.addFromTemplate') })).toContain(
      'addTemplate',
    )
    expect(ids({ unlocked: only('nb.reviewNotebook') })).toContain('review')
    expect(ids({ unlocked: only('nb.move') })).toEqual(
      expect.arrayContaining(['moveTop', 'moveUp', 'moveDown']),
    )
    expect(ids()).not.toContain('moveUp')
  })

  it('Move up is off at the top and Move down at the bottom', () => {
    const items = notebookStripItems({
      ...base,
      unlocked: () => true,
      canMoveUp: false,
      canMoveDown: false,
    })
    for (const id of ['moveTop', 'moveUp', 'moveDown'])
      expect(items.find((i) => i.id === id)?.disabled).toBe(true)
  })

  it('Cover offers the other cover and the next colour', () => {
    const cover = (coverIsPage: boolean) =>
      notebookStripItems({ ...base, coverIsPage }).find((i) => i.id === 'cover')
        ?.menu
    expect(cover(false)?.map((m) => m.id)).toEqual(['page', 'next'])
    expect(cover(true)?.map((m) => m.id)).toEqual(['colour', 'next'])
  })

  it('Duplicate shows only when the service exists', () => {
    expect(ids()).not.toContain('duplicate')
    expect(ids({ canDuplicate: true })).toContain('duplicate')
  })
})
