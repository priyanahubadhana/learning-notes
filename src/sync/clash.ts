import type { LearningNotesDB } from '../core/db'
import type { Block, BlockClash, JsonObject } from '../core/types'

/**
 * "Changed on two devices" (R6-13): the version of a block that lost is kept
 * on the block as `clash` until the person chooses. It is a normal field of
 * the block, so it syncs and clears on every device with the choice.
 */

/** Puts the other version on a block (this device's text won a clash). */
export async function markClash(
  db: LearningNotesDB,
  blockId: string,
  other: { type: string; content: JsonObject },
): Promise<void> {
  await db.transaction('rw', db.blocks, async () => {
    const b = await db.blocks.get(blockId)
    if (!b || b.deletedAt !== null) return
    const clash: BlockClash = { ...other, at: Date.now() }
    await db.blocks.put({ ...b, clash, updatedAt: Date.now() })
  })
}

/** Takes the mark off (the person chose). Sent to the other devices. */
export async function clearClash(
  db: LearningNotesDB,
  blockId: string,
): Promise<void> {
  await db.transaction('rw', db.blocks, async () => {
    const b = await db.blocks.get(blockId)
    if (!b?.clash) return
    const { clash: _gone, ...rest } = b
    void _gone
    await db.blocks.put({ ...(rest as Block), updatedAt: Date.now() })
  })
}

/** A short plain-text look at a block's content for the bar. */
export function excerptOf(content: unknown, max = 60): string {
  const parts: string[] = []
  const walk = (v: unknown) => {
    if (typeof v === 'string') parts.push(v)
    else if (Array.isArray(v)) v.forEach(walk)
    else if (v && typeof v === 'object') {
      const o = v as Record<string, unknown>
      if (typeof o.text === 'string') parts.push(o.text)
      else if (o.text !== undefined) walk(o.text)
    }
  }
  walk((content as { text?: unknown } | null)?.text)
  const text = parts.join('').replace(/\s+/g, ' ').trim()
  return text.length > max ? `${text.slice(0, max - 1)}…` : text
}

/**
 * Owner bug batch 2, item 1: is `theirs` a real, independent edit? A
 * three-way check against the last common version (`base`, null when not
 * known). No clash when it is the same as the base or as ours, or an earlier
 * or shorter state of the same line (it sits inside what we have or had), as
 * happens while typing with another device open on the page.
 */
export function independentEdit(
  base: string | null,
  mine: string,
  theirs: string,
): boolean {
  const t = theirs.replace(/s+/g, ' ').trim()
  if (t === '') return false
  const norm = (x: string | null) => (x ?? '').replace(/s+/g, ' ').trim()
  const m = norm(mine)
  const b = norm(base)
  if (t === m || t === b) return false
  if ((m && m.includes(t)) || (b && b.includes(t))) return false
  return true
}
