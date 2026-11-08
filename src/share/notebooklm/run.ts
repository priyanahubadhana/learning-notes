import { saveAttachment } from '../../core/attachments'
import { addBlocks, type BlockInput } from '../../core/blockBulk'
import type { LearningNotesDB } from '../../core/db'
import { createId } from '../../core/ids'
import { fileRef } from '../../core/fileRef'
import { isLive, softDeleteMany } from '../../core/records'
import type { JsonObject, Page } from '../../core/types'
import { deleteRecording, saveRecording } from '../../audio/recordingService'
import { ensureBlockView } from '../../databases/blockViews'
import {
  guessMapping,
  importCsvRows,
  type ColumnMapping,
} from '../../databases/csvTransfer'
import { createDatabase, deleteDatabase } from '../../databases/databaseService'
import { fromOutline, serializeMindMap } from '../../editor/mindMap/model'
import { inlineRuns, markdownToBlocks } from '../../editor/textBlocks'
import { imageRef } from '../../images/imageRef'
import { saveImage } from '../../images/imageService'
import { t } from '../../i18n/t'
import { createPage, deletePage } from '../../pages/pageService'
import { syncCardRecords } from '../../recall/cardService'
import type { QaCard } from './parse'

/**
 * "Bring in from NotebookLM": one function per output. Each adds to a page
 * and returns what it made, so one Undo takes it all back (to Trash).
 */

export interface NlmMade {
  /** The page it went to. */
  pageId: string
  /** True when the page was made by this import (Undo removes it). */
  newPage: boolean
  blockIds: string[]
  recordingIds: string[]
  fileIds: string[]
  databaseIds: string[]
  /** What was added, for the toast. */
  count: number
}

const empty = (page: Page, newPage: boolean): NlmMade => ({
  pageId: page.id,
  newPage,
  blockIds: [],
  recordingIds: [],
  fileIds: [],
  databaseIds: [],
  count: 0,
})

export interface NlmTarget {
  notebookId: string
  /** An existing page, or null for a new page named `title`. */
  pageId: string | null
  title: string
}

/** The page the import goes to (made if the choice is "a new page"). */
export async function resolveTarget(
  db: LearningNotesDB,
  target: NlmTarget,
): Promise<{ page: Page; newPage: boolean }> {
  if (target.pageId) {
    const page = await db.pages.get(target.pageId)
    if (!page || !isLive(page)) throw new Error('Page not found')
    return { page, newPage: false }
  }
  const page = await createPage(
    db,
    target.notebookId,
    null,
    target.title.slice(0, 200),
  )
  return { page, newPage: true }
}

const fileBlock = (id: string, name: string, size: number): BlockInput => ({
  type: 'file',
  content: { url: fileRef(id), name, size, caption: '' },
})

/** An audio overview: kept as a recording of the page (plays in the Audio panel). */
export async function importAudio(
  db: LearningNotesDB,
  page: Page,
  file: File,
  durationMs: number,
  newPage: boolean,
): Promise<NlmMade> {
  const rec = await saveRecording(db, {
    pageId: page.id,
    name: file.name.replace(/\.[^.]+$/, '').slice(0, 120) || t('nlm.audioName'),
    type: file.type || 'audio/mp4',
    startedAt: Date.now(),
    durationMs,
    data: await file.arrayBuffer(),
  })
  return { ...empty(page, newPage), recordingIds: [rec.id], count: 1 }
}

/** A video overview: a file block that plays inline. */
export async function importVideo(
  db: LearningNotesDB,
  page: Page,
  file: File,
  newPage: boolean,
): Promise<NlmMade> {
  const saved = await saveAttachment(db, page.id, file)
  const [block] = await addBlocks(
    db,
    page.id,
    [fileBlock(saved.id, saved.name, saved.size)],
    { source: 'import', batchId: createId() },
  )
  return {
    ...empty(page, newPage),
    fileIds: [saved.id],
    blockIds: [block.id],
    count: 1,
  }
}

/** A slide deck (PDF or PPTX): kept as a file and flagged for the Slides tab. */
export async function importSlides(
  db: LearningNotesDB,
  page: Page,
  file: File,
  newPage: boolean,
): Promise<NlmMade> {
  const saved = await saveAttachment(db, page.id, file)
  await db.bookFiles.update(saved.id, { slides: true })
  const [block] = await addBlocks(
    db,
    page.id,
    [fileBlock(saved.id, saved.name, saved.size)],
    { source: 'import', batchId: createId() },
  )
  return {
    ...empty(page, newPage),
    fileIds: [saved.id],
    blockIds: [block.id],
    count: 1,
  }
}

/** A picture (a mind map or infographic PNG): an image block. */
export async function importPicture(
  db: LearningNotesDB,
  page: Page,
  file: File,
  newPage: boolean,
  prepare?: Parameters<typeof saveImage>[2],
): Promise<NlmMade & { imageId: string }> {
  const image = await saveImage(db, file, prepare)
  const [block] = await addBlocks(
    db,
    page.id,
    [
      {
        type: 'image',
        content: {
          url: imageRef(image.id),
          caption: file.name.replace(/\.[^.]+$/, '').slice(0, 120),
        },
      },
    ],
    { source: 'import', batchId: createId() },
  )
  return {
    ...empty(page, newPage),
    blockIds: [block.id],
    count: 1,
    imageId: image.id,
  }
}

/** Copied report or briefing text: the same reader the paste uses (headings, lists, tables). */
export async function importReport(
  db: LearningNotesDB,
  page: Page,
  text: string,
  newPage: boolean,
): Promise<NlmMade> {
  const blocks = markdownToBlocks(text)
  if (blocks.length === 0) throw new Error(t('nlm.err.empty'))
  const made = await addBlocks(db, page.id, blocks, {
    source: 'import',
    batchId: createId(),
  })
  return {
    ...empty(page, newPage),
    blockIds: made.map((b) => b.id),
    count: made.length,
  }
}

/** Question and answer cards (flashcards or a quiz): Card blocks under a heading. */
export async function importCards(
  db: LearningNotesDB,
  page: Page,
  cards: readonly QaCard[],
  newPage: boolean,
): Promise<NlmMade> {
  if (cards.length === 0) throw new Error(t('nlm.err.noCards'))
  const answer = (a: string): BlockInput[] =>
    a
      ? a.split('\n').map((line) => ({
          type: 'paragraph',
          content: { text: inlineRuns(line) },
        }))
      : []
  const inputs: BlockInput[] = [
    {
      type: 'heading',
      content: {
        level: 2,
        text: [{ type: 'text', text: t('nlm.cardsHeading'), styles: {} }],
      } as JsonObject,
    },
    ...cards.map((c): BlockInput => ({
      type: 'card',
      content: { text: inlineRuns(c.q.replace(/\n/g, ' ')) },
      children: answer(c.a),
    })),
  ]
  const made = await addBlocks(db, page.id, inputs, {
    source: 'import',
    batchId: createId(),
  })
  await syncCardRecords(db, page.id)
  return {
    ...empty(page, newPage),
    blockIds: made.map((b) => b.id),
    count: cards.length,
  }
}

/** An indented outline: a mind map block (the same one the editor makes). */
export async function importMindMap(
  db: LearningNotesDB,
  page: Page,
  outline: string,
  newPage: boolean,
): Promise<NlmMade> {
  const map = fromOutline(outline, page.title)
  if (map.nodes.length < 2) throw new Error(t('nlm.err.empty'))
  const [block] = await addBlocks(
    db,
    page.id,
    [
      {
        type: 'mindMap',
        content: { data: serializeMindMap(map), theme: 'calm' },
      },
    ],
    { source: 'import', batchId: createId() },
  )
  return {
    ...empty(page, newPage),
    blockIds: [block.id],
    count: map.nodes.length,
  }
}

/** A table: a new database (columns guessed) shown as a Database block on the page. */
export async function importTable(
  db: LearningNotesDB,
  workspaceId: string,
  page: Page,
  headers: readonly string[],
  body: readonly (readonly string[])[],
  name: string,
  newPage: boolean,
): Promise<NlmMade> {
  if (headers.length === 0 || body.length === 0)
    throw new Error(t('nlm.err.empty'))
  const database = await createDatabase(
    db,
    workspaceId,
    page.notebookId,
    name.slice(0, 200) || t('nlm.tableName'),
  )
  const mapping: ColumnMapping[] = guessMapping(
    headers,
    [],
    database.titleName ?? '',
    body,
  )
  await importCsvRows(db, database.id, headers, body, mapping)
  const [block] = await addBlocks(
    db,
    page.id,
    [{ type: 'database', content: { databaseId: database.id } }],
    { source: 'import', batchId: createId() },
  )
  await ensureBlockView(db, database.id, block.id)
  return {
    ...empty(page, newPage),
    blockIds: [block.id],
    databaseIds: [database.id],
    count: body.length,
  }
}

/** One Undo for everything an import made (it all goes to Trash). */
export async function undoImport(
  db: LearningNotesDB,
  made: NlmMade,
): Promise<void> {
  const now = Date.now()
  if (made.newPage) {
    await deletePage(db, made.pageId).catch(() => {})
  } else {
    await softDeleteMany(db.blocks, made.blockIds, now)
    await syncCardRecords(db, made.pageId).catch(() => {})
  }
  for (const id of made.recordingIds) await deleteRecording(db, id)
  await softDeleteMany(db.bookFiles, made.fileIds, now)
  for (const id of made.databaseIds)
    await deleteDatabase(db, id).catch(() => {})
}

/** A record of nothing made, for cleaning up a page an import made and then failed on. */
export const emptyMade = (pageId: string): NlmMade => ({
  pageId,
  newPage: true,
  blockIds: [],
  recordingIds: [],
  fileIds: [],
  databaseIds: [],
  count: 0,
})
