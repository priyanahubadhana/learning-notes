import { describe, expect, it } from 'vitest'
import type { Rec } from './jobTypes'
import { StaleError, writeAll, type Tx } from './notesTx'

function memTx(seed: Rec[]): Tx & { rows: Map<string, Rec> } {
  const rows = new Map(seed.map((r) => [`pages/${String(r.id)}`, r]))
  return {
    rows,
    get: async (t, id) => rows.get(`${t}/${id}`),
    put: async (t, v) => {
      rows.set(`${t}/${String(v.id)}`, v)
    },
  }
}

describe('writeAll', () => {
  // Staging gives a record without updatedAt the revision 1 (never 0).
  it('edits an old record that has no time stamp', async () => {
    const tx = memTx([{ id: 'p1', title: 'Old' }])
    const value = { id: 'p1', title: 'New', updatedAt: 5 }
    await writeAll(tx, [{ table: 'pages', id: 'p1', value, baseRev: 1 }])
    expect(tx.rows.get('pages/p1')).toEqual(value)
  })

  it('still refuses a record that changed since staging', async () => {
    const tx = memTx([{ id: 'p1', title: 'Old', updatedAt: 9 }])
    const value = { id: 'p1', title: 'New', updatedAt: 5 }
    await expect(
      writeAll(tx, [{ table: 'pages', id: 'p1', value, baseRev: 3 }]),
    ).rejects.toBeInstanceOf(StaleError)
  })
})
