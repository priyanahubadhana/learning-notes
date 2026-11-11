import type { LearningNotesDB } from './db'
import { purgeMany } from './records'
import { imageIdsIn } from '../images/imageRef'

/**
 * "Delete forever" and pictures (privacy). A picture is stored once in
 * `images` and written into notes as "lnimg:<id>", so erasing a page's
 * blocks alone leaves the picture itself on the device. These two steps
 * find the pictures the doomed pages and blocks use (before their content
 * is erased) and, once they are gone, erase every picture nothing else
 * still shows, with its edit copies and original. Pictures that another
 * page, a trashed page (it can still be restored), a database cell or a
 * notebook cover still uses are kept.
 */

/** Ids of the pictures used by these pages (cells, covers) and blocks. */
export async function imagesUsedBy(
  db: LearningNotesDB,
  pageIds: readonly string[],
  blockIds: readonly string[],
): Promise<Set<string>> {
  const pages = await db.pages.bulkGet([...pageIds])
  const blocks = await db.blocks.bulkGet([...blockIds])
  const found = imageIdsIn([pages, blocks])
  // A book's cover is stored as a bare picture id, not as a reference.
  for (const page of pages)
    if (page?.source?.coverImageId) found.add(page.source.coverImageId)
  return found
}

/** The empty shell left in place of an erased picture. */
const EMPTIED = {
  data: new ArrayBuffer(0),
  name: '',
  width: 0,
  height: 0,
  originalId: undefined,
}

/**
 * Erases the pictures in `candidates` that nothing live shows any more.
 * Call after the pages and blocks have been erased, in the same transaction
 * (`db.images` must be one of its tables).
 */
export async function purgeUnusedImages(
  db: LearningNotesDB,
  candidates: ReadonlySet<string>,
  now: number,
): Promise<void> {
  if (candidates.size === 0) return
  // The family of each candidate: its original and every edit made from it.
  const families = new Map<string, Set<string>>()
  const known = await db.images.bulkGet([...candidates])
  known.forEach((image, i) => {
    if (!image) return
    const root = image.originalId ?? image.id
    const members = families.get(root) ?? new Set([root])
    members.add([...candidates][i])
    families.set(root, members)
  })
  await db.images
    .filter((image) => !!image.originalId && families.has(image.originalId))
    .each((image) => void families.get(image.originalId!)!.add(image.id))
  const everyone = new Set([...families.values()].flatMap((m) => [...m]))

  // What still shows any of them: other notes, trashed (restorable) notes,
  // database cells, covers and notebooks.
  const shown = new Set<string>()
  const scan = async (
    each: (visit: (row: unknown) => void) => Promise<unknown>,
  ) => {
    await each((row) => {
      for (const id of imageIdsIn(row)) if (everyone.has(id)) shown.add(id)
    })
  }
  await scan((visit) => db.blocks.each((b) => visit(b.content)))
  await scan((visit) => db.pages.each((p) => visit(p.values)))
  await db.pages.each((p) => {
    const cover = p.source?.coverImageId
    if (cover && p.purgedAt === undefined && everyone.has(cover))
      shown.add(cover)
  })
  await scan((visit) => db.notebooks.each((n) => visit(n)))

  const gone: string[] = []
  for (const members of families.values()) {
    // Another page may still show a picture of this family and need its
    // original for "Restore original": only this page's own pictures go then.
    const inUse = [...members].some((id) => shown.has(id))
    for (const id of members) {
      if (shown.has(id)) continue
      if (!inUse || candidates.has(id)) gone.push(id)
    }
  }
  const live = (await db.images.bulkGet(gone))
    .filter((image) => image && image.purgedAt === undefined)
    .map((image) => image!.id)
  await purgeMany(db.images, live, { ...EMPTIED, deletedAt: now }, now)
}
