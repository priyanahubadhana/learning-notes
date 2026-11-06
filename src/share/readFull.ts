import { Unzip, UnzipInflate, UnzipPassThrough } from 'fflate'
import type { LearningNotesDB } from '../core/db'
import { t } from '../i18n/t'
import { isImageType } from '../images/imageRef'
import { BundleError } from './bundle'
import { checkedRow, isAudioType, type RowTable } from './checkRows'
import {
  FULL_FORMAT_VERSION,
  LIMITS,
  type BinMarker,
  type Manifest,
} from './fullFile'

/**
 * Opening the zip format. Everything is checked before anything is used:
 * the app and kind are known, the format and database are not newer than this
 * app, the number of entries and the unzipped size are capped, entry names
 * are only the ones we write, and every row is checked.
 */

/** Zip files start with "PK\3\4". */
export const isZip = (head: Uint8Array): boolean =>
  head.length >= 4 &&
  head[0] === 0x50 &&
  head[1] === 0x4b &&
  head[2] === 0x03 &&
  head[3] === 0x04

const damaged = () => new BundleError(t('err.fileDamaged'))
const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

/** A sink gets an entry's bytes; returning true stops the scan. */
type Sink = (chunk: Uint8Array, final: boolean) => boolean | void

/** Reads a zip as a stream, entry by entry, enforcing the size limits. */
async function scanZip(
  blob: Blob,
  open: (name: string) => Sink | null,
): Promise<void> {
  let failure: unknown
  let entries = 0
  let total = 0
  let stop = false
  let started = 0
  let finished = 0
  const unzip = new Unzip((file) => {
    if (failure || stop) return
    entries++
    if (entries > LIMITS.maxEntries) {
      failure = new BundleError(t('err.tooBigFile'))
      return
    }
    const sink = open(file.name)
    if (!sink) {
      failure = damaged()
      return
    }
    file.ondata = (err, data, final) => {
      if (failure || stop) return
      if (err) {
        failure = damaged()
        return
      }
      total += data.length
      if (total > LIMITS.maxUnzipped) {
        failure = new BundleError(t('err.tooBigFile'))
        file.terminate()
        return
      }
      try {
        if (final) finished++
        if (sink(data, final)) stop = true
      } catch (e) {
        failure = e
      }
    }
    started++
    file.start()
  })
  unzip.register(UnzipInflate)
  unzip.register(UnzipPassThrough)
  const reader = blob.stream().getReader()
  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      try {
        unzip.push(value, false)
      } catch (e) {
        failure ??= e instanceof BundleError ? e : damaged()
      }
      if (failure || stop) break
    }
    if (!failure && !stop) {
      try {
        unzip.push(new Uint8Array(0), true)
      } catch (e) {
        failure ??= e instanceof BundleError ? e : damaged()
      }
    }
  } finally {
    await reader.cancel().catch(() => {})
  }
  if (failure) throw failure instanceof BundleError ? failure : damaged()
  if (!stop && started !== finished) throw damaged()
}

const nonNegative = (v: unknown): v is number =>
  typeof v === 'number' && Number.isInteger(v) && v >= 0

/** Checks a parsed manifest against what this app can open. */
export function checkManifest(
  data: unknown,
  currentDbVersion: number,
): Manifest {
  if (!isObject(data) || data.app !== 'learning-notes') {
    throw new BundleError(t('err.notOurFile'))
  }
  if (data.kind !== 'full' && data.kind !== 'notes') {
    throw new BundleError(t('err.unknownKind'))
  }
  const { formatVersion, dbVersion } = data
  if (!nonNegative(formatVersion) || formatVersion < 2) throw damaged()
  if (formatVersion > FULL_FORMAT_VERSION) {
    throw new BundleError(t('err.newerFile'))
  }
  if (!nonNegative(dbVersion) || dbVersion < 1) throw damaged()
  if (dbVersion > currentDbVersion) throw new BundleError(t('err.newerFile'))
  const { counts, tables } = data
  if (
    !isObject(counts) ||
    !isObject(tables) ||
    !nonNegative(counts.notebooks) ||
    !nonNegative(counts.pages) ||
    !nonNegative(counts.cards) ||
    !nonNegative(counts.pictures) ||
    !Object.values(tables).every(nonNegative) ||
    !Object.keys(tables).every((name) => /^\w{1,64}$/.test(name))
  ) {
    throw damaged()
  }
  return {
    app: 'learning-notes',
    kind: data.kind,
    formatVersion,
    dbVersion,
    createdAt: Number(data.createdAt) || 0,
    tables: tables as Record<string, number>,
    counts: counts as Manifest['counts'],
    media: data.media === true,
  }
}

function concat(chunks: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(chunks.reduce((n, c) => n + c.length, 0))
  let at = 0
  for (const c of chunks) {
    out.set(c, at)
    at += c.length
  }
  return out
}

/** Reads only the manifest (the first entry), so the dialog opens fast. */
export async function readManifest(
  blob: Blob,
  db: LearningNotesDB,
): Promise<Manifest> {
  const chunks: Uint8Array[] = []
  let size = 0
  let text: string | undefined
  try {
    await scanZip(blob, (name) => {
      if (name !== 'manifest.json' || text !== undefined) return null
      return (chunk, final) => {
        size += chunk.length
        if (size > 1_000_000) throw damaged()
        chunks.push(chunk)
        if (final) {
          text = new TextDecoder().decode(concat(chunks))
          return true
        }
      }
    })
  } catch (e) {
    // A zip whose first entry is something else is not our file.
    if (text === undefined) {
      throw e instanceof BundleError && e.message !== t('err.fileDamaged')
        ? e
        : new BundleError(t('err.notOurFile'))
    }
  }
  if (text === undefined) throw new BundleError(t('err.notOurFile'))
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    throw damaged()
  }
  return checkManifest(data, db.verno)
}

/** True if `value` has an own key `__proto__` anywhere inside. */
function hasProto(value: unknown, depth = 0): boolean {
  if (depth > 200) return true // absurdly deep: refuse
  if (Array.isArray(value)) return value.some((v) => hasProto(v, depth + 1))
  if (!isObject(value)) return false
  for (const key of Object.keys(value)) {
    if (key === '__proto__' || hasProto(value[key], depth + 1)) return true
  }
  return false
}

type Row = Record<string, unknown>

export interface ParsedFull {
  manifest: Manifest
  /** Rows as stored, pictures as `ArrayBuffer`. */
  tables: Record<string, Row[]>
}

/** Tables whose rows have field-by-field checks (see checkRows.ts). */
const CHECKED = new Set<string>([
  'notebooks',
  'pages',
  'blocks',
  'cards',
  'reviewLogs',
  'databases',
  'dbColumns',
  'dbViews',
  'inkLayers',
  'inkChunks',
  'recordings',
])

/** Reads and fully checks a full file. Nothing is written. */
export async function readFullFile(
  blob: Blob,
  db: LearningNotesDB,
): Promise<ParsedFull> {
  const known = new Set(db.tables.map((tb) => tb.name))
  let manifest: Manifest | undefined
  const rawTables: Record<string, Row[]> = {}
  const media = new Map<string, Uint8Array>()
  let rows = 0

  await scanZip(blob, (name) => {
    if (name === 'manifest.json') {
      const chunks: Uint8Array[] = []
      return (chunk, final) => {
        chunks.push(chunk)
        if (final) {
          try {
            manifest = checkManifest(
              JSON.parse(new TextDecoder().decode(concat(chunks))),
              db.verno,
            )
          } catch (e) {
            throw e instanceof BundleError ? e : damaged()
          }
        }
      }
    }
    const table = /^tables\/(\w{1,64})\.jsonl$/.exec(name)?.[1]
    if (table) {
      if (!manifest || !known.has(table) || table in rawTables) return null
      const list: Row[] = (rawTables[table] = [])
      const decoder = new TextDecoder()
      let rest = ''
      const take = (line: string) => {
        if (!line) return
        let row: unknown
        try {
          row = JSON.parse(line)
        } catch {
          throw damaged()
        }
        if (++rows > LIMITS.maxRows) throw new BundleError(t('err.tooBigFile'))
        if (!isObject(row)) throw damaged()
        list.push(row)
      }
      return (chunk, final) => {
        rest += decoder.decode(chunk, { stream: !final })
        const lines = rest.split('\n')
        rest = lines.pop() ?? ''
        lines.forEach(take)
        if (final) take(rest)
      }
    }
    if (/^media\/\w{1,64}\/\d{1,9}$/.test(name)) {
      if (!manifest || media.has(name)) return null
      const chunks: Uint8Array[] = []
      return (chunk, final) => {
        chunks.push(chunk)
        if (final) media.set(name, concat(chunks))
      }
    }
    return null // any other name: not one of ours
  })
  if (!manifest) throw new BundleError(t('err.notOurFile'))
  // A cut-off file ends without an error: check it is all there.
  for (const [name, count] of Object.entries(manifest.tables)) {
    if ((rawTables[name]?.length ?? 0) !== count) throw damaged()
  }

  const tables: Record<string, Row[]> = {}
  for (const [table, list] of Object.entries(rawTables)) {
    const key = db.table(table).schema.primKey.keyPath
    if (typeof key !== 'string') throw damaged()
    const seen = new Set<string>()
    tables[table] = list.map((row) => {
      const id = row[key]
      if (
        typeof id !== 'string' ||
        id === '' ||
        seen.has(id) ||
        hasProto(row)
      ) {
        throw damaged()
      }
      seen.add(id)
      if (CHECKED.has(table) && checkedRow(table as RowTable, row) === null) {
        throw damaged()
      }
      return putBack(table, row, media)
    })
  }
  return { manifest, tables }
}

/** Replaces bin markers by the bytes (empty if the media were left out). */
function putBack(
  table: string,
  row: Row,
  media: ReadonlyMap<string, Uint8Array>,
): Row {
  const out: Row = { ...row }
  for (const [field, value] of Object.entries(row)) {
    if (!isObject(value) || !('$bin' in value)) continue
    const marker = value as unknown as BinMarker
    if (
      (marker.$bin !== null && typeof marker.$bin !== 'string') ||
      (marker.kind !== 'buffer' && marker.kind !== 'bytes') ||
      (marker.$bin !== null && !marker.$bin.startsWith(`media/${table}/`))
    ) {
      throw damaged()
    }
    const bytes = marker.$bin === null ? undefined : media.get(marker.$bin)
    if (marker.$bin !== null && !bytes) throw damaged()
    const copy = (bytes ?? new Uint8Array(0)).slice()
    out[field] = marker.kind === 'buffer' ? copy.buffer : copy
  }
  if (table === 'images') {
    const ok =
      typeof out.type === 'string' &&
      isImageType(out.type) &&
      out.data instanceof ArrayBuffer
    if (!ok) throw damaged()
  }
  if (table === 'recordings') {
    // Its type is checked field by field (checkRows); the bytes must be bytes.
    if (!(out.data instanceof ArrayBuffer) || !isAudioType(out.type)) {
      throw damaged()
    }
  }
  return out
}
