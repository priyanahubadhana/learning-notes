import { t } from '../i18n/t'
import { listBlocks } from '../core/blockService'
import type { LearningNotesDB } from '../core/db'
import type { Block, JsonValue, Page } from '../core/types'
import { blankIds, noteLinkProps } from '../editor/mapping'
import { getNotebook } from '../notebooks/notebookService'
import { listNotePages } from '../pages/pageService'
import { CARD_BLOCK_TYPE } from '../recall/cardService'
import { loadSql } from './sqlite'

/**
 * A notebook's cards as an Anki package (.apkg, the older format that every
 * Anki version can import). Card blocks become "Basic" notes (question →
 * Front, answer lines → Back); lines with blanks become "Cloze" notes. Each
 * page becomes a deck named after the notebook and the page. Schedules are
 * not exported: every card arrives as New.
 */

const BASIC_MODEL = 1_607_392_319_001
const CLOZE_MODEL = 1_607_392_319_002

const isObject = (v: unknown): v is Record<string, JsonValue> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

const escapeHtml = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/**
 * Rich text as HTML (bold, italic, underline only). `clozeNumbers` maps a
 * blank's id to its Anki number: those words become {{cN::…}}.
 */
export function runsToHtml(
  runs: JsonValue | undefined,
  clozeNumbers?: ReadonlyMap<string, number>,
): string {
  let out = ''
  let openBlank: string | null = null
  const closeBlank = () => {
    if (openBlank !== null) out += '}}'
    openBlank = null
  }
  const visit = (list: JsonValue | undefined) => {
    if (!Array.isArray(list)) return
    for (const run of list) {
      if (!isObject(run)) continue
      const link = noteLinkProps(run)
      let text = ''
      if (typeof run.text === 'string') text = run.text
      else if (link) text = link.label
      if (text) {
        const styles = isObject(run.styles) ? run.styles : {}
        const blank =
          typeof styles.blank === 'string'
            ? clozeNumbers?.get(styles.blank)
            : undefined
        const id = blank === undefined ? null : String(styles.blank)
        if (id !== openBlank) closeBlank()
        if (id !== null && openBlank === null) {
          out += `{{c${blank}::`
          openBlank = id
        }
        let html = escapeHtml(text)
        if (styles.bold) html = `<b>${html}</b>`
        if (styles.italic) html = `<i>${html}</i>`
        if (styles.underline) html = `<u>${html}</u>`
        out += html
      } else {
        closeBlank()
      }
      visit(run.content) // links hold their own runs
    }
  }
  visit(runs)
  closeBlank()
  return out
}

/** The block's descendants in reading order. */
function descendants(blocks: Block[], parentId: string): Block[] {
  const out: Block[] = []
  const walk = (id: string) => {
    for (const child of blocks.filter((b) => b.parentId === id)) {
      out.push(child)
      walk(child.id)
    }
  }
  walk(parentId)
  return out
}

interface ExportNote {
  deck: string
  model: 'basic' | 'cloze'
  fields: string[]
  /** Cloze numbers used (cards = one per number). */
  numbers: number[]
}

/** The notes a page makes. */
function notesOf(deck: string, blocks: Block[]): ExportNote[] {
  const notes: ExportNote[] = []
  for (const block of blocks) {
    if (block.type === CARD_BLOCK_TYPE) {
      const front = runsToHtml(block.content.text)
      if (!front) continue
      const back = descendants(blocks, block.id)
        .map((b) => runsToHtml(b.content.text))
        .filter(Boolean)
        .join('<br>')
      notes.push({ deck, model: 'basic', fields: [front, back], numbers: [] })
      continue
    }
    const ids = blankIds(block.content)
    if (ids.length === 0) continue
    const numbers = new Map(ids.map((id, i) => [id, i + 1]))
    notes.push({
      deck,
      model: 'cloze',
      fields: [runsToHtml(block.content.text, numbers), ''],
      numbers: [...numbers.values()],
    })
  }
  return notes
}

/** Anki's checksum of a note's first field: the first 8 hex digits of its SHA-1. */
async function checksum(field: string): Promise<number> {
  const plain = field.replace(/<[^>]*>/g, '')
  const hash = await crypto.subtle.digest(
    'SHA-1',
    new TextEncoder().encode(plain),
  )
  const hex = [...new Uint8Array(hash).slice(0, 4)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
  return parseInt(hex, 16)
}

const SCHEMA = `
CREATE TABLE col (id integer primary key, crt integer not null, mod integer not null, scm integer not null, ver integer not null, dty integer not null, usn integer not null, ls integer not null, conf text not null, models text not null, decks text not null, dconf text not null, tags text not null);
CREATE TABLE notes (id integer primary key, guid text not null, mid integer not null, mod integer not null, usn integer not null, tags text not null, flds text not null, sfld integer not null, csum integer not null, flags integer not null, data text not null);
CREATE TABLE cards (id integer primary key, nid integer not null, did integer not null, ord integer not null, mod integer not null, usn integer not null, type integer not null, queue integer not null, due integer not null, ivl integer not null, factor integer not null, reps integer not null, lapses integer not null, left integer not null, odue integer not null, odid integer not null, flags integer not null, data text not null);
CREATE TABLE revlog (id integer primary key, cid integer not null, usn integer not null, ease integer not null, ivl integer not null, lastIvl integer not null, factor integer not null, time integer not null, type integer not null);
CREATE TABLE graves (usn integer not null, oid integer not null, type integer not null);
CREATE INDEX ix_notes_usn on notes (usn);
CREATE INDEX ix_cards_usn on cards (usn);
CREATE INDEX ix_revlog_usn on revlog (usn);
CREATE INDEX ix_cards_nid on cards (nid);
CREATE INDEX ix_cards_sched on cards (did, queue, due);
CREATE INDEX ix_revlog_cid on revlog (cid);
CREATE INDEX ix_notes_csum on notes (csum);
`

const CSS =
  '.card {\n font-family: arial;\n font-size: 20px;\n text-align: center;\n color: black;\n background-color: white;\n}\n.cloze {\n font-weight: bold;\n color: blue;\n}'

function model(id: number, name: string, cloze: boolean, now: number) {
  const fields = cloze ? ['Text', 'Back Extra'] : ['Front', 'Back']
  return {
    id,
    name,
    type: cloze ? 1 : 0,
    mod: Math.floor(now / 1000),
    usn: -1,
    sortf: 0,
    did: 1,
    tmpls: [
      {
        name: cloze ? 'Cloze' : 'Card 1',
        ord: 0,
        qfmt: cloze ? '{{cloze:Text}}' : '{{Front}}',
        afmt: cloze
          ? '{{cloze:Text}}<br>\n{{Back Extra}}'
          : '{{FrontSide}}\n\n<hr id=answer>\n\n{{Back}}',
        bqfmt: '',
        bafmt: '',
        did: null,
        bfont: '',
        bsize: 0,
      },
    ],
    flds: fields.map((n, ord) => ({
      name: n,
      ord,
      sticky: false,
      rtl: false,
      font: 'Arial',
      size: 20,
      media: [],
    })),
    css: CSS,
    latexPre:
      '\\documentclass[12pt]{article}\n\\special{papersize=3in,5in}\n\\usepackage[utf8]{inputenc}\n\\usepackage{amssymb,amsmath}\n\\pagestyle{empty}\n\\setlength{\\parindent}{0in}\n\\begin{document}\n',
    latexPost: '\\end{document}',
    latexsvg: false,
    req: cloze ? [[0, 'any', [0]]] : [[0, 'any', [0]]],
    tags: [],
    vers: [],
  }
}

const deckObject = (id: number, name: string, now: number) => ({
  id,
  mod: Math.floor(now / 1000),
  name,
  usn: -1,
  lrnToday: [0, 0],
  revToday: [0, 0],
  newToday: [0, 0],
  timeToday: [0, 0],
  collapsed: false,
  browserCollapsed: false,
  desc: '',
  dyn: 0,
  conf: 1,
  extendNew: 0,
  extendRev: 0,
})

const DECK_CONFIG = {
  '1': {
    id: 1,
    mod: 0,
    name: 'Default',
    usn: 0,
    maxTaken: 60,
    autoplay: true,
    timer: 0,
    replayq: true,
    new: {
      bury: false,
      delays: [1, 10],
      initialFactor: 2500,
      ints: [1, 4, 0],
      order: 1,
      perDay: 20,
    },
    rev: {
      bury: false,
      ease4: 1.3,
      ivlFct: 1,
      maxIvl: 36500,
      perDay: 200,
      hardFactor: 1.2,
    },
    lapse: {
      delays: [10],
      leechAction: 1,
      leechFails: 8,
      minInt: 1,
      mult: 0,
    },
  },
}

export interface AnkiExport {
  file: Uint8Array
  fileName: string
  notes: number
  cards: number
}

/** "Cardiology.apkg" */
export const apkgFileName = (title: string): string =>
  `${title.replace(/[\\/:*?"<>|]+/g, ' ').trim() || 'notebook'}.apkg`

/**
 * Builds the package for one notebook. Throws if it has no cards (there
 * would be nothing to import).
 */
export async function exportApkg(
  db: LearningNotesDB,
  notebookId: string,
  now: number = Date.now(),
): Promise<AnkiExport> {
  const notebook = await getNotebook(db, notebookId)
  if (!notebook) throw new Error(t('anki.notebookGone'))
  const pages = await listNotePages(db, notebookId)
  const byId = new Map(pages.map((p) => [p.id, p]))
  const deckName = (page: Page): string => {
    const names: string[] = []
    for (
      let p: Page | undefined = page;
      p && names.length < 20;
      p = p.parentId ? byId.get(p.parentId) : undefined
    ) {
      names.unshift((p.title || 'Untitled').replaceAll('::', ':'))
    }
    return [notebook.title.replaceAll('::', ':') || 'Notebook', ...names].join(
      '::',
    )
  }
  const notes: ExportNote[] = []
  for (const page of pages) {
    notes.push(...notesOf(deckName(page), await listBlocks(db, page.id)))
  }
  if (notes.length === 0) {
    throw new Error(t('anki.noCards'))
  }

  const SQL = await loadSql()
  const sqlite = new SQL.Database()
  try {
    sqlite.run(SCHEMA)
    const decks: Record<string, unknown> = {
      '1': deckObject(1, 'Default', now),
    }
    const deckIds = new Map<string, number>()
    for (const note of notes) {
      if (deckIds.has(note.deck)) continue
      const id = now + deckIds.size + 1
      deckIds.set(note.deck, id)
      decks[String(id)] = deckObject(id, note.deck, now)
    }
    const models = {
      [BASIC_MODEL]: model(BASIC_MODEL, 'Basic', false, now),
      [CLOZE_MODEL]: model(CLOZE_MODEL, 'Cloze', true, now),
    }
    const seconds = Math.floor(now / 1000)
    sqlite.run(
      'insert into col values (1, ?, ?, ?, 11, 0, 0, 0, ?, ?, ?, ?, ?)',
      [
        seconds - (seconds % 86400),
        now,
        now,
        JSON.stringify({
          activeDecks: [1],
          curDeck: 1,
          newSpread: 0,
          collapseTime: 1200,
          timeLim: 0,
          estTimes: true,
          dueCounts: true,
          curModel: null,
          nextPos: 1,
          sortType: 'noteFld',
          sortBackwards: false,
          addToCur: true,
        }),
        JSON.stringify(models),
        JSON.stringify(decks),
        JSON.stringify(DECK_CONFIG),
        '{}',
      ],
    )
    let cardCount = 0
    let id = now
    const noteStmt = sqlite.prepare(
      "insert into notes values (?, ?, ?, ?, -1, '', ?, ?, ?, 0, '')",
    )
    const cardStmt = sqlite.prepare(
      "insert into cards values (?, ?, ?, ?, ?, -1, 0, 0, ?, 0, 0, 0, 0, 0, 0, 0, 0, '')",
    )
    try {
      for (const [i, note] of notes.entries()) {
        const noteId = ++id
        noteStmt.run([
          noteId,
          crypto.randomUUID().replaceAll('-', '').slice(0, 10),
          note.model === 'cloze' ? CLOZE_MODEL : BASIC_MODEL,
          seconds,
          note.fields.join('\x1f'),
          note.fields[0].replace(/<[^>]*>/g, ''),
          await checksum(note.fields[0]),
        ])
        const ords =
          note.model === 'cloze' ? note.numbers.map((n) => n - 1) : [0]
        for (const ord of ords) {
          cardStmt.run([
            ++id,
            noteId,
            deckIds.get(note.deck)!,
            ord,
            seconds,
            i + 1,
          ])
          cardCount++
        }
      }
    } finally {
      noteStmt.free()
      cardStmt.free()
    }
    const bytes = sqlite.export()
    const { zipSync } = await import('fflate')
    const file = zipSync({
      'collection.anki2': bytes,
      media: new TextEncoder().encode('{}'),
    })
    return {
      file,
      fileName: apkgFileName(notebook.title),
      notes: notes.length,
      cards: cardCount,
    }
  } finally {
    sqlite.close()
  }
}
