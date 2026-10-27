import { t } from '../i18n/t'
import { hasCloze } from './ankiHtml'
import { loadSql } from './sqlite'

/**
 * Reads an Anki package (.apkg): a zip holding the collection as a SQLite
 * file. Old Anki saves `collection.anki2` / `collection.anki21`; new Anki
 * saves `collection.anki21b`, the same kind of file compressed with zstd.
 * Only the notes and their decks are read: pictures, sounds and review
 * history are left behind (see importApkg.ts).
 */

/** Largest collection file read (bytes, after unzipping). */
export const MAX_COLLECTION_BYTES = 400_000_000

/** What is wrong with a file that cannot be read. */
export class AnkiError extends Error {}

export interface AnkiNote {
  id: number
  /** Deck name with levels as in Anki ("Medicine::Heart"). */
  deck: string
  /** Field texts (HTML), first field first. */
  fields: string[]
  kind: 'basic' | 'cloze'
}

export interface AnkiCollection {
  notes: AnkiNote[]
  /** Pictures and sounds in the package (not imported). */
  mediaCount: number
}

type Row = (string | number | Uint8Array | null)[]

const WANTED = ['collection.anki21b', 'collection.anki21', 'collection.anki2']

/** The bytes of the SQLite file inside the package. */
async function collectionBytes(
  file: Uint8Array,
): Promise<{ bytes: Uint8Array; media: number }> {
  const { unzipSync, strFromU8 } = await import('fflate')
  let entries: Record<string, Uint8Array>
  try {
    entries = unzipSync(file, {
      // Only the collection (and the small media list) is unpacked.
      filter: (info) => {
        if (WANTED.includes(info.name)) {
          if (info.originalSize > MAX_COLLECTION_BYTES) {
            throw new AnkiError(t('anki.tooBig'))
          }
          return true
        }
        return info.name === 'media' && info.originalSize < 50_000_000
      },
    })
  } catch (error) {
    if (error instanceof AnkiError) throw error
    throw new AnkiError(t('anki.notPackage'))
  }
  const name = WANTED.find((n) => entries[n])
  if (!name) throw new AnkiError(t('anki.noCollection'))
  let bytes = entries[name]
  if (name.endsWith('b')) {
    // Unpacked in pieces, so a file that claims to be small but expands
    // into gigabytes (a "bomb") is stopped at the limit.
    const { Decompress } = await import('fzstd')
    const pieces: Uint8Array[] = []
    let total = 0
    let tooBig = false
    try {
      const stream = new Decompress((chunk) => {
        total += chunk.length
        if (total > MAX_COLLECTION_BYTES) {
          tooBig = true
          throw new Error('too big')
        }
        pieces.push(chunk)
      })
      stream.push(bytes, true)
    } catch {
      throw new AnkiError(t(tooBig ? 'anki.tooBig' : 'anki.damaged'))
    }
    bytes = new Uint8Array(total)
    let at = 0
    for (const piece of pieces) {
      bytes.set(piece, at)
      at += piece.length
    }
  }
  const media = (() => {
    try {
      // Old packages: a JSON map {"0": "file.jpg"}. New ones keep a binary list; skipped.
      const list: unknown = JSON.parse(
        strFromU8(entries.media ?? new Uint8Array()),
      )
      return list && typeof list === 'object' ? Object.keys(list).length : 0
    } catch {
      return 0
    }
  })()
  return { bytes, media }
}

/** Reads a package's notes. Throws `AnkiError` for a file that is not one. */
export async function readApkg(file: Uint8Array): Promise<AnkiCollection> {
  const { bytes, media } = await collectionBytes(file)
  const SQL = await loadSql()
  let db
  try {
    db = new SQL.Database(bytes)
  } catch {
    throw new AnkiError(t('anki.damaged'))
  }
  try {
    // A file that is not a collection (no notes table) is refused.
    try {
      db.exec('select 1 from notes limit 1')
    } catch {
      throw new AnkiError(t('anki.damaged'))
    }
    const rows = (sql: string): Row[] => {
      try {
        return (db.exec(sql)[0]?.values ?? []) as Row[]
      } catch {
        return [] // a table this version of Anki does not have
      }
    }
    const names = new Map<number, string>()
    // New Anki: a decks table (levels joined by \x1f). Old: JSON in col.decks.
    for (const [id, name] of rows('select id, name from decks')) {
      names.set(Number(id), String(name).replaceAll('\x1f', '::'))
    }
    if (names.size === 0) {
      const [[json] = []] = rows('select decks from col')
      try {
        const decks = JSON.parse(String(json ?? '{}')) as Record<
          string,
          { name?: string }
        >
        for (const [id, deck] of Object.entries(decks)) {
          if (typeof deck?.name === 'string') names.set(Number(id), deck.name)
        }
      } catch {
        // no deck names: everything goes into "Imported"
      }
    }
    // A note's deck: the deck of its first card.
    const deckOf = new Map<number, number>()
    for (const [nid, did] of rows(
      'select nid, did from cards order by ord, id',
    )) {
      if (!deckOf.has(Number(nid))) deckOf.set(Number(nid), Number(did))
    }
    const notes: AnkiNote[] = []
    for (const [id, flds] of rows('select id, flds from notes order by id')) {
      const fields = String(flds ?? '').split('\x1f')
      notes.push({
        id: Number(id),
        deck: names.get(deckOf.get(Number(id)) ?? -1) ?? 'Imported',
        fields,
        kind: hasCloze(fields[0] ?? '') ? 'cloze' : 'basic',
      })
    }
    if (
      notes.length === 1 &&
      /please update to the latest anki/i.test(notes[0].fields.join(' '))
    ) {
      throw new AnkiError(t('anki.placeholder'))
    }
    return { notes, mediaCount: media }
  } finally {
    db.close()
  }
}
