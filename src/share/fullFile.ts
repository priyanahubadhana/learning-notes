import { Zip, ZipDeflate } from 'fflate'
import type { LearningNotesDB } from '../core/db'

/**
 * The full save file (format 2): a zip with
 *   manifest.json            what it is, versions, counts
 *   tables/<table>.jsonl     one JSON row per line, exactly as stored
 *   media/<table>/<n>        raw bytes of pictures (any binary field)
 * Tables come from `db.tables`, so a table added later is saved with no
 * change here. "Save notes only" is the same file without the media entries:
 * the rows are still listed, so links in the notes stay valid.
 */

export const FULL_FORMAT_VERSION = 2
/** Largest zip file read or promised (bytes): about 1 GB. */
export const MAX_FULL_BYTES = 1_000_000_000
/** Most entries a zip may hold when opened. */
export const MAX_ZIP_ENTRIES = 200_000
/** Most bytes a zip may expand to when opened (guards against zip bombs). */
export const MAX_UNZIPPED_BYTES = 2_500_000_000
/** Most rows in one file. */
export const MAX_ROWS = 2_000_000

export type FullKind = 'full' | 'notes'

export interface Manifest {
  app: 'learning-notes'
  kind: FullKind
  formatVersion: number
  /** Dexie version of the database the rows came from. */
  dbVersion: number
  /** UTC time the file was saved (ms). */
  createdAt: number
  /** Rows per table. */
  tables: Record<string, number>
  /** Counts of live things, for the restore dialog. */
  counts: { notebooks: number; pages: number; cards: number; pictures: number }
  /** True if the binary media are in the file. */
  media: boolean
}

/** Marker that stands where a row's bytes were (`$bin` = entry, null = left out). */
export interface BinMarker {
  $bin: string | null
  kind: 'buffer' | 'bytes'
}

/** "Learning Notes 2026-10-28.learningnotes.zip" */
export const fullFileName = (
  now: number = Date.now(),
  kind: FullKind = 'full',
): string =>
  `Learning Notes${kind === 'notes' ? ' (notes only)' : ''} ${new Date(now).toISOString().slice(0, 10)}.learningnotes.zip`

const encoder = new TextEncoder()
const LINE_BATCH = 512 * 1024
const tick = () => new Promise<void>((resolve) => setTimeout(resolve, 0))

const isBinary = (v: unknown): v is ArrayBuffer | ArrayBufferView =>
  v instanceof ArrayBuffer || ArrayBuffer.isView(v)

const bytesOf = (v: ArrayBuffer | ArrayBufferView): Uint8Array =>
  v instanceof ArrayBuffer
    ? new Uint8Array(v)
    : new Uint8Array(v.buffer, v.byteOffset, v.byteLength)

const isLiveRow = (r: { deletedAt?: number | null }) =>
  r.deletedAt === null || r.deletedAt === undefined

interface MediaRef {
  table: string
  key: unknown
  field: string
  entry: string
}

/**
 * Saves the database as a zip (see above). Rows are read in one read
 * transaction (a consistent picture), then written row by row; picture bytes
 * are fetched one at a time so they are never all held twice.
 */
export async function writeFullFile(
  db: LearningNotesDB,
  kind: FullKind,
  now: number = Date.now(),
): Promise<Blob> {
  const withMedia = kind === 'full'
  const lines = new Map<string, string[]>()
  const refs: MediaRef[] = []
  const counts = { notebooks: 0, pages: 0, cards: 0, pictures: 0 }
  const tableCounts: Record<string, number> = {}

  await db.transaction('r', db.tables, async () => {
    for (const table of db.tables) {
      const keyPath = table.schema.primKey.keyPath
      const chunks: string[] = []
      let batch = ''
      let n = 0
      await table.each((row: Record<string, unknown>) => {
        const out: Record<string, unknown> = { ...row }
        for (const [field, value] of Object.entries(row)) {
          if (!isBinary(value)) continue
          const entry = withMedia ? `media/${table.name}/${refs.length}` : null
          const marker: BinMarker = {
            $bin: entry,
            kind: value instanceof ArrayBuffer ? 'buffer' : 'bytes',
          }
          out[field] = marker
          if (entry) {
            refs.push({
              table: table.name,
              key: typeof keyPath === 'string' ? row[keyPath] : undefined,
              field,
              entry,
            })
          }
        }
        batch += JSON.stringify(out) + '\n'
        if (batch.length >= LINE_BATCH) {
          chunks.push(batch)
          batch = ''
        }
        n++
        const live = isLiveRow(row)
        if (table.name === 'notebooks' && live && !row.kind) counts.notebooks++
        else if (table.name === 'pages' && live) counts.pages++
        else if (table.name === 'cards' && live) counts.cards++
        else if (table.name === 'images' && live) counts.pictures++
      })
      if (batch) chunks.push(batch)
      lines.set(table.name, chunks)
      tableCounts[table.name] = n
    }
  })

  const manifest: Manifest = {
    app: 'learning-notes',
    kind,
    formatVersion: FULL_FORMAT_VERSION,
    dbVersion: db.verno,
    createdAt: now,
    tables: tableCounts,
    counts,
    media: withMedia,
  }

  const parts: BlobPart[] = []
  let failure: unknown
  const zip = new Zip((err, chunk) => {
    if (err) failure = err
    else parts.push(chunk as BlobPart)
  })
  const add = async (
    name: string,
    pieces: Iterable<Uint8Array>,
    level: 0 | 6,
  ) => {
    const file = new ZipDeflate(name, { level })
    zip.add(file)
    for (const piece of pieces) {
      file.push(piece)
      if (failure) throw failure
      await tick() // keep the screen alive on big files
    }
    file.push(new Uint8Array(0), true)
  }

  await add('manifest.json', [encoder.encode(JSON.stringify(manifest))], 6)
  for (const [name, chunks] of lines) {
    await add(
      `tables/${name}.jsonl`,
      chunks.map((c) => encoder.encode(c)),
      6,
    )
    lines.set(name, []) // let go of the text as soon as it is written
  }
  for (const ref of refs) {
    const row = (await db.table(ref.table).get(ref.key as never)) as
      Record<string, unknown> | undefined
    const value = row?.[ref.field]
    // Pictures are already compressed: stored (level 0).
    await add(ref.entry, isBinary(value) ? [bytesOf(value)] : [], 0)
  }
  zip.end()
  if (failure) throw failure
  return new Blob(parts, { type: 'application/zip' })
}

/** The limits in force (a test may lower them to try the guards). */
export const LIMITS = {
  maxEntries: MAX_ZIP_ENTRIES,
  maxUnzipped: MAX_UNZIPPED_BYTES,
  maxRows: MAX_ROWS,
}
