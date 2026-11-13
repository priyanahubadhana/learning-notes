import { describe, expect, it } from 'vitest'
import {
  buildRows,
  cleanPins,
  visibleGroups,
  type PageSheetActions,
} from './pageSheetModel'

const noop = () => {}
const sub = [{ label: 'x', run: noop }]
const actions: PageSheetActions = {
  rename: noop,
  duplicate: noop,
  favourite: { on: false, run: noop },
  saveTemplate: noop,
  importInto: noop,
  remove: noop,
  restore: noop,
  reading: noop,
  paperStyle: sub,
  paperSize: sub,
  deviceMode: sub,
  toolbar: { shown: true, run: noop },
  theme: sub,
  exportPage: noop,
  copy: sub,
  pastePlain: noop,
  lock: { label: 'Lock', run: noop },
  history: noop,
  review: noop,
  prompts: noop,
  search: noop,
}

describe('page sheet model (PM-61, PM-62, PM-63)', () => {
  const rows = buildRows(actions)

  it('PM-61 Beginner sees 8 rows in the spec order, no section headings', () => {
    const groups = visibleGroups(rows, false)
    expect(groups).toHaveLength(1)
    expect(groups[0].section).toBeNull()
    expect(groups[0].rows.map((r) => r.id)).toEqual([
      'rename',
      'move',
      'duplicate',
      'export',
      'history',
      'lock',
      'delete',
      'reading',
    ])
  })

  it('PM-62 Professional sees 22 rows in 5 sections', () => {
    const groups = visibleGroups(rows, true)
    expect(groups.map((g) => g.section)).toEqual([
      'page',
      'view',
      'share',
      'protect',
      'tools',
    ])
    expect(groups.flatMap((g) => g.rows)).toHaveLength(22)
  })

  it('Delete is danger and a row that does not apply is left out', () => {
    expect(rows.find((r) => r.id === 'delete')?.danger).toBe(true)
    const t = buildRows({
      ...actions,
      saveTemplate: undefined,
      review: undefined,
      prompts: undefined,
      lock: undefined,
    })
    expect(t.map((r) => r.id)).not.toContain('saveTemplate')
    expect(t.map((r) => r.id)).not.toContain('lock')
  })

  it('PM-63 pins keep known ids, once each, at most 5', () => {
    const known = rows.map((r) => r.id)
    expect(
      cleanPins(
        [
          'history',
          'history',
          'nope',
          'export',
          'rename',
          'move',
          'lock',
          'delete',
        ],
        known,
      ),
    ).toEqual(['history', 'export', 'rename', 'move', 'lock'])
    expect(cleanPins('x', known)).toEqual([])
  })
})
