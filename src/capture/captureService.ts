import { addBlocks, type BlockInput } from '../core/blockBulk'
import type { LearningNotesDB } from '../core/db'
import { isHttpsUrl } from '../core/sourceCheck'
import type { Page, PageSource } from '../core/types'
import { sanitizePastedHtml } from '../editor/clipboard'
import { htmlToBlocks, markdownToBlocks } from '../editor/textBlocks'
import { t } from '../i18n/t'
import { ensureSourceNotebook } from '../library/libraryService'
import { createPage } from '../pages/pageService'
import { parseYoutube } from './youtube'

/**
 * Capture (CR1): turns a link and/or pasted text into a source page in the
 * Sources notebook. The app fetches nothing: it keeps what it is given (a
 * browser cannot read most pages or YouTube transcripts by itself).
 */

export class CaptureError extends Error {}

/** Most text kept from one capture (2 MB of characters). */
export const MAX_CAPTURE_CHARS = 2_000_000

export interface CaptureInput {
  url?: string
  title?: string
  text?: string
}

/** What kind of source an input is. */
export function captureKind(
  input: CaptureInput,
): 'video' | 'article' | 'paste' {
  const url = input.url?.trim()
  if (url && parseYoutube(url)) return 'video'
  if (url) return 'article'
  return 'paste'
}

const looksLikeHtml = (text: string) =>
  /<(p|div|h[1-6]|ul|ol|li|br|span|a|table|article)[\s>/]/i.test(text)

/** Pasted text to blocks: HTML is cleaned first; anything else is Markdown/plain. */
export function textToBlocks(text: string): BlockInput[] {
  return looksLikeHtml(text)
    ? htmlToBlocks(sanitizePastedHtml(text))
    : markdownToBlocks(text)
}

function titleFor(
  input: CaptureInput,
  kind: 'video' | 'article' | 'paste',
): string {
  const given = input.title?.trim()
  if (given) return given.slice(0, 200)
  if (kind === 'video') return t('capture.kind.video')
  const firstLine = input.text
    ?.split('\n')
    .map((l) => l.replace(/^#+\s*/, '').trim())
    .find(Boolean)
  if (firstLine) return firstLine.slice(0, 80)
  try {
    if (input.url) return new URL(input.url).hostname.replace(/^www\./, '')
  } catch {
    /* fall through */
  }
  return t(`capture.kind.${kind}`)
}

/**
 * Makes the source page. Needs a valid https link or some text; a link that
 * is not https is refused. Returns the new page.
 */
export async function captureSource(
  db: LearningNotesDB,
  workspaceId: string,
  input: CaptureInput,
  now: number = Date.now(),
): Promise<Page> {
  const url = input.url?.trim() || undefined
  const text = input.text?.trim() || undefined
  if (!url && !text) throw new CaptureError(t('capture.needSomething'))
  if (url && !isHttpsUrl(url)) throw new CaptureError(t('capture.badUrl'))
  if (text && text.length > MAX_CAPTURE_CHARS) {
    throw new CaptureError(t('capture.tooLong'))
  }
  const kind = captureKind({ url, text })
  const yt = url ? parseYoutube(url) : null
  const notebook = await ensureSourceNotebook(db, workspaceId, 'sources')
  const page = await createPage(
    db,
    notebook.id,
    null,
    titleFor({ ...input, url, text }, kind),
  )
  const source: PageSource = {
    kind,
    capturedAt: now,
    ...(url ? { url } : {}),
    ...(yt ? { videoId: yt.videoId, startSec: yt.startSec } : {}),
  }
  await db.pages.update(page.id, { source, updatedAt: Date.now() })
  if (text) await addBlocks(db, page.id, textToBlocks(text))
  return { ...page, source }
}
