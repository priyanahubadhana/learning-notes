import type { LearningNotesDB } from './db'
import { fontFormat, fontNameOf, MAX_FONT_BYTES } from './fontFile'
import { newRecordFields } from './records'
import type { StoredFont } from './types'
import { t } from '../i18n/t'

/** What is wrong with a font file that cannot be added. */
export class FontError extends Error {}

/** Checks and stores a font file the user picked. */
export async function saveFont(
  db: LearningNotesDB,
  file: Blob & { name?: string },
): Promise<StoredFont> {
  if (file.size > MAX_FONT_BYTES) throw new FontError(t('font.tooBig'))
  const data = await file.arrayBuffer()
  const format = fontFormat(new Uint8Array(data))
  if (!format) throw new FontError(t('font.badType'))
  const font: StoredFont = {
    ...newRecordFields(),
    name: fontNameOf(file.name ?? 'Font'),
    format,
    data,
  }
  await db.fonts.add(font)
  return font
}

/** Imported fonts that are not deleted, in the order they were added. */
export async function listFonts(db: LearningNotesDB): Promise<StoredFont[]> {
  const all = await db.fonts.toArray()
  return all
    .filter((f) => f.deletedAt === null && f.data.byteLength > 0)
    .sort((a, b) => a.createdAt - b.createdAt)
}

/** Removes an imported font (soft delete, like everything else). */
export async function removeFont(
  db: LearningNotesDB,
  id: string,
): Promise<void> {
  const now = Date.now()
  await db.fonts.update(id, { deletedAt: now, updatedAt: now })
}
