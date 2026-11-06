import { listBlocks } from '../core/blockService'
import type { LearningNotesDB } from '../core/db'
import type { Page } from '../core/types'
import { toPlainText } from '../editor/mapping'
import type { CaptureInput } from './captureService'

/** The words of a source page, as the source of a prompt (up to 120,000 characters). */
export async function pageSourceInput(
  db: LearningNotesDB,
  page: Page,
): Promise<CaptureInput> {
  const blocks = await listBlocks(db, page.id)
  const text = blocks
    .map((b) => toPlainText(b.content))
    .filter(Boolean)
    .join('\n')
    .slice(0, 120_000)
  return { url: page.source?.url, title: page.title, text: text || undefined }
}
