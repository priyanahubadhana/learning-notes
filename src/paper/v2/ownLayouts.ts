import type { LearningNotesDB } from '../../core/db'
import { isGridRows } from '../../core/gridRows'
import { createId } from '../../core/ids'
import type { GridRow, JsonValue } from '../../core/types'
import type { SettingDefinition } from '../../settings/registry'
import { getSetting, setSetting } from '../../settings/settingsService'
import { newRowId, normaliseFracs, reconcile, rowBoxIds } from '../grid'

/**
 * TB-28 (Professional, `tb.layouts`): the person's own layouts. A layout is
 * the shape of a page (rows of columns, how many boxes stack in each), saved
 * with a name beside the box presets (a synced setting, no new table).
 */
export interface LayoutShape {
  rows: { cols: { w: number; stack: number }[] }[]
}
export interface OwnLayout extends LayoutShape {
  id: string
  name: string
}

export const MAX_OWN_LAYOUTS = 8
const MAX_SHAPE_ROWS = 60

const isShape = (v: unknown): v is LayoutShape =>
  !!v &&
  typeof v === 'object' &&
  Array.isArray((v as LayoutShape).rows) &&
  (v as LayoutShape).rows.length <= MAX_SHAPE_ROWS &&
  (v as LayoutShape).rows.every(
    (r) =>
      Array.isArray(r?.cols) &&
      r.cols.length >= 1 &&
      r.cols.length <= 3 &&
      r.cols.every(
        (c) =>
          typeof c?.w === 'number' &&
          c.w > 0 &&
          Number.isInteger(c.stack) &&
          c.stack >= 1 &&
          c.stack <= 8,
      ),
  )

export const isOwnLayouts = (v: unknown): v is OwnLayout[] =>
  Array.isArray(v) &&
  v.length <= MAX_OWN_LAYOUTS &&
  v.every(
    (l) =>
      l &&
      typeof l.id === 'string' &&
      typeof l.name === 'string' &&
      l.name.length <= 40 &&
      isShape(l),
  )

export const ownLayoutsSetting: SettingDefinition<JsonValue> = {
  id: 'paper.boxLayouts',
  labelKey: 'boxCard.myLayouts',
  descriptionKey: 'boxCard.layouts',
  category: 'general',
  scope: 'synced',
  group: 'appearance',
  defaultValue: [],
  isValid: isOwnLayouts as unknown as (v: unknown) => v is JsonValue,
  control: { kind: 'labels' },
}

export const loadLayouts = async (db: LearningNotesDB) =>
  (await getSetting(db, ownLayoutsSetting)) as unknown as OwnLayout[]
const store = (db: LearningNotesDB, next: OwnLayout[]) =>
  setSetting(db, ownLayoutsSetting, next as unknown as JsonValue)

/** The shape of a page's rows (its own text box stays out); null when it holds no other box. */
export function shapeOf(
  rows: readonly GridRow[],
  mainId = 'main',
): LayoutShape | null {
  const out: LayoutShape['rows'] = []
  for (const row of rows) {
    const cols = row.cols
      .map((c) => ({
        w: c.w,
        stack: Math.min(8, c.boxIds.filter((b) => b !== mainId).length),
      }))
      .filter((c) => c.stack > 0)
    if (!cols.length) continue
    const fr = normaliseFracs(cols.map((c) => c.w))
    out.push({
      cols: cols.map((c, i) => ({
        ...c,
        w: Math.round(fr[i] * 100) / 100,
      })),
    })
  }
  return out.length && out.length <= MAX_SHAPE_ROWS ? { rows: out } : null
}

/** The page's rows laid out in a saved shape: boxes in reading order; extra boxes get a row each. */
export function applyShape(
  rows: readonly GridRow[],
  shape: LayoutShape,
  mainId = 'main',
): GridRow[] | null {
  const all = rows.flatMap(rowBoxIds)
  const rest = all.filter((id) => id !== mainId)
  const out: GridRow[] = []
  if (all.includes(mainId))
    out.push({ id: newRowId(), cols: [{ w: 1, boxIds: [mainId] }] })
  let i = 0
  for (const r of shape.rows) {
    if (i >= rest.length) break
    const cols = r.cols.flatMap((c) => {
      const boxIds = rest.slice(i, i + c.stack)
      i += boxIds.length
      return boxIds.length ? [{ w: c.w, boxIds }] : []
    })
    const fr = normaliseFracs(cols.map((c) => c.w))
    out.push({
      id: newRowId(),
      cols: cols.map((c, k) => ({ ...c, w: Math.round(fr[k] * 100) / 100 })),
    })
  }
  for (; i < rest.length; i++)
    out.push({ id: newRowId(), cols: [{ w: 1, boxIds: [rest[i]] }] })
  const clean = reconcile(out, all)
  return isGridRows(clean) ? clean : null
}

export async function saveLayout(
  db: LearningNotesDB,
  name: string,
  shape: LayoutShape,
): Promise<OwnLayout[] | null> {
  const all = await loadLayouts(db)
  if (all.length >= MAX_OWN_LAYOUTS) return null
  const next = [...all, { id: createId(), name: name.slice(0, 40), ...shape }]
  await store(db, next)
  return next
}

export async function renameLayout(
  db: LearningNotesDB,
  id: string,
  name: string,
): Promise<OwnLayout[]> {
  const next = (await loadLayouts(db)).map((l) =>
    l.id === id ? { ...l, name: name.slice(0, 40) || l.name } : l,
  )
  await store(db, next)
  return next
}

export async function deleteLayout(
  db: LearningNotesDB,
  id: string,
): Promise<OwnLayout[]> {
  const next = (await loadLayouts(db)).filter((l) => l.id !== id)
  await store(db, next)
  return next
}
