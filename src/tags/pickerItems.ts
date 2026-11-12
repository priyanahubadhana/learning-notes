import type { LearningNotesDB } from '../core/db'
import { listTags } from './tagService'

/**
 * The live tags as picker items (read-only: this never writes). `counts` is the
 * use count per tag id when the caller has it; missing = 0.
 */
export async function loadTagItems(
  db: LearningNotesDB,
  counts: ReadonlyMap<string, number> = new Map(),
): Promise<PickerTag[]> {
  return (await listTags(db)).map((t) => ({
    id: t.id,
    name: t.name,
    parentId: t.parentId,
    count: counts.get(t.id) ?? 0,
    color: t.color,
  }))
}

/** The shape the design tag picker takes (kept structural: no design import). */
type PickerTag = {
  id: string
  name: string
  parentId: string | null
  count: number
  color?: string
}
