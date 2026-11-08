import { addBlocks, type BlockInput } from '../core/blockBulk'
import type { LearningNotesDB } from '../core/db'
import { createId } from '../core/ids'
import type { JsonObject, JsonValue } from '../core/types'
import { notesToBlocks } from '../capture/importNotes'
import type { ParsedCard, ParsedNotes } from '../capture/notesFormat'
import { ensureBlockView } from '../databases/blockViews'
import {
  addColumn,
  addRows,
  createDatabase,
  deleteDatabase,
} from '../databases/databaseService'
import {
  serializeMindMap,
  type MindMap,
  type MindNode,
} from '../editor/mindMap/model'
import { markdownToBlocks } from '../editor/textBlocks'
import { t } from '../i18n/t'
import { iconSymbol } from './iconNames'
import { createNotebook, deleteNotebook } from '../notebooks/notebookService'
import { createPage, deletePage } from '../pages/pageService'
import { syncCardRecords } from '../recall/cardService'
import {
  levelOf,
  type Level,
  type SkillCard,
  type SkillPoint,
  type SkillResult,
} from './skillFormat'

/**
 * Saving a skill result (after the preview): the ticked parts become an
 * overview page (summary, keyword summary with key points, mind map,
 * database of points, sources), detailed pages under it, and a Cards page.
 * Everything is marked AI-made with one batch id. `undoSave` takes it all
 * away again (one Undo).
 */

/** What the preview decided: the ticked items, and which derived parts to make. */
export interface Chosen {
  result: SkillResult
  make: {
    summary: boolean
    keywords: boolean
    mindMap: boolean
    rows: boolean
    cards: boolean
  }
}

export type Target =
  { kind: 'existing'; notebookId: string } | { kind: 'new'; title: string }

export interface Saved {
  notebookId: string
  newNotebook: boolean
  pageIds: string[]
  databaseId?: string
  /** The overview page (or the first page made), to open. */
  firstPageId: string
  batchId: string
}

const run = (text: string, styles: JsonObject = {}): JsonObject => ({
  type: 'text',
  text,
  styles,
})
const heading = (text: string): BlockInput => ({
  type: 'heading',
  content: { level: 2, text: [run(text)] },
})
const para = (text: string, styles: JsonObject = {}): BlockInput => ({
  type: 'paragraph',
  content: { text: [run(text, styles)] },
})

const LEVELS: Level[] = ['must', 'good', 'extra']
const levelName = (l: Level) => t(`prompts.level.${l}`)

/** "[1][2]" for a point's sources. */
const cite = (p: SkillPoint) => p.sources.map((n) => `[${n}]`).join('')

/** The text of one key point line. */
export function pointLine(p: SkillPoint): string {
  const parts = [iconSymbol(p.icon), p.text, `(${p.stars}/10)`, cite(p)].filter(
    Boolean,
  )
  let line = parts.join(' ')
  if (p.flag) line += ` — ${t(`prompts.flag.${p.flag}`)}`
  else if (!p.checked) line += ` — ${t('prompts.unchecked')}`
  return line
}

/** Points sorted: Must know first, then by stars (stable). */
const byImportance = (points: readonly SkillPoint[]) =>
  points
    .map((p, i) => ({ p, i }))
    .sort((a, b) => b.p.stars - a.p.stars || a.i - b.i)

/** The mind map: the title in the middle, a branch per topic, Must know first. */
export function buildMindMap(result: SkillResult, title: string): MindMap {
  const root = createId()
  const nodes: MindNode[] = [
    { id: root, text: title.slice(0, 200), parent: null },
  ]
  const topics = new Map<string, string>()
  for (const { p } of byImportance(result.points)) {
    const topic = p.topic || t('prompts.topicOther')
    let parent = topics.get(topic)
    if (!parent) {
      parent = createId()
      topics.set(topic, parent)
      nodes.push({ id: parent, text: topic.slice(0, 200), parent: root })
    }
    nodes.push({
      id: createId(),
      text: [iconSymbol(p.icon), p.text]
        .filter(Boolean)
        .join(' ')
        .slice(0, 200),
      parent,
    })
  }
  return { root, nodes: nodes.slice(0, 500) }
}

/** Cards for the Cards page: every kind, and one for each Must know point that has none. */
export function buildCards(result: SkillResult): ParsedCard[] {
  const out: ParsedCard[] = []
  const covered = new Set<number>()
  const icon = (c: SkillCard) =>
    c.point !== null && result.points[c.point]?.level === 'must'
      ? `${iconSymbol(result.points[c.point].icon)} `
      : ''
  for (const c of result.cards) {
    if (c.point !== null) covered.add(c.point)
    if (c.kind === 'cloze') out.push({ kind: 'cloze', text: icon(c) + c.q })
    else if (c.kind === 'reverse') {
      out.push({ kind: 'qa', q: icon(c) + c.q, a: c.a })
      out.push({ kind: 'qa', q: c.a, a: c.q })
    } else if (c.kind === 'truefalse') {
      out.push({
        kind: 'qa',
        q: `${icon(c)}${t('prompts.trueOrFalse')} ${c.q}`,
        a: c.a,
      })
    } else out.push({ kind: 'qa', q: icon(c) + c.q, a: c.a })
  }
  result.points.forEach((p, i) => {
    if (p.level !== 'must' || covered.has(i)) return
    out.push({
      kind: 'qa',
      q: `${iconSymbol(p.icon)} ${t('prompts.recallPoint', { topic: p.topic || result.title })}`,
      a: p.text,
    })
  })
  return out.slice(0, 500)
}

async function makePointsDatabase(
  db: LearningNotesDB,
  workspaceId: string,
  notebookId: string,
  title: string,
  points: readonly SkillPoint[],
): Promise<string> {
  const database = await createDatabase(db, workspaceId, notebookId, title)
  const levelIds = Object.fromEntries(
    LEVELS.map((l) => [l, createId()]),
  ) as Record<Level, string>
  const level = await addColumn(db, database.id, {
    name: t('prompts.col.level'),
    type: 'choice',
    config: {
      options: LEVELS.map((l, i) => ({
        id: levelIds[l],
        name: levelName(l),
        color: ['#e5484d', '#2f6feb', '#8a8f98'][i],
      })) as unknown as JsonValue,
    },
  })
  const stars = await addColumn(db, database.id, {
    name: t('prompts.col.pointStars'),
    type: 'number',
    config: { format: 'stars', max: 10 },
  })
  const topic = await addColumn(db, database.id, {
    name: t('prompts.col.topic'),
    type: 'text',
  })
  const sources = await addColumn(db, database.id, {
    name: t('prompts.part.sources'),
    type: 'text',
  })
  const checked = await addColumn(db, database.id, {
    name: t('prompts.col.checked'),
    type: 'checkbox',
  })
  const icon = await addColumn(db, database.id, {
    name: t('prompts.col.icon'),
    type: 'text',
  })
  await addRows(
    db,
    database.id,
    byImportance(points).map(({ p }) => ({
      title: p.text.slice(0, 2000),
      values: {
        [level.id]: levelIds[levelOf(p.stars)],
        [stars.id]: p.stars,
        [topic.id]: p.topic,
        [sources.id]: cite(p),
        [checked.id]: p.checked,
        [icon.id]: iconSymbol(p.icon),
      },
    })),
  )
  return database.id
}

/**
 * Writes the chosen parts into a notebook (an existing one, or a new one
 * named by the user). If anything fails half-way, what was made is removed
 * again before the error goes on.
 */
export async function saveSkillResult(
  db: LearningNotesDB,
  workspaceId: string,
  chosen: Chosen,
  target: Target,
): Promise<Saved> {
  const { result, make } = chosen
  const title = result.title || t('prompts.untitled')
  const batchId = createId()
  const opts = { source: 'ai', batchId } as const
  const notebook =
    target.kind === 'new'
      ? await createNotebook(
          db,
          workspaceId,
          target.title.trim().slice(0, 200) || t('prompts.researchBook'),
        )
      : await db.notebooks.get(target.notebookId)
  if (!notebook || notebook.deletedAt !== null) throw new Error('No notebook')
  const saved: Saved = {
    notebookId: notebook.id,
    newNotebook: target.kind === 'new',
    pageIds: [],
    firstPageId: '',
    batchId,
  }
  try {
    const overview: BlockInput[] = []
    const tail: BlockInput[] = []
    if (make.summary && result.summary) {
      overview.push(heading(t('library.section.summary')), para(result.summary))
    }
    if (make.keywords && (result.keywords.length || result.points.length)) {
      overview.push(heading(t('prompts.part.keywords')))
      if (result.keywords.length) {
        overview.push(para(result.keywords.join(' · '), { bold: true }))
      }
      for (const level of LEVELS) {
        const group = byImportance(result.points).filter(
          ({ p }) => levelOf(p.stars) === level,
        )
        if (group.length === 0) continue
        overview.push(para(levelName(level), { italic: true }))
        for (const { p } of group) {
          overview.push({
            type: 'bulletListItem',
            content: {
              text: [run(pointLine(p), level === 'must' ? { bold: true } : {})],
            },
          })
        }
      }
    }
    if (make.mindMap && result.points.length) {
      overview.push(heading(t('capture.sectionMindMap')), {
        type: 'mindMap',
        content: {
          data: serializeMindMap(buildMindMap(result, title)),
          theme: 'calm',
        },
      })
    }
    if (result.sources.length) {
      tail.push(heading(t('prompts.part.sources')))
      for (const s of result.sources) {
        tail.push({
          type: 'paragraph',
          content: {
            text: [run(`[${s.n}] ${s.title}${s.url ? ` — ${s.url}` : ''}`)],
          },
        })
      }
    }

    const hasOverview =
      overview.length > 0 ||
      tail.length > 0 ||
      (make.rows && result.points.length > 0)
    let overviewId: string | null = null
    if (hasOverview) {
      const page = await createPage(db, notebook.id, null, title.slice(0, 200))
      saved.pageIds.push(page.id)
      saved.firstPageId = page.id
      overviewId = page.id
      await addBlocks(db, page.id, overview, opts)
      if (make.rows && result.points.length) {
        saved.databaseId = await makePointsDatabase(
          db,
          workspaceId,
          notebook.id,
          `${title}: ${t('prompts.part.rows')}`.slice(0, 200),
          result.points,
        )
        const made = await addBlocks(
          db,
          page.id,
          [
            heading(t('prompts.part.rows')),
            { type: 'database', content: { databaseId: saved.databaseId } },
          ],
          opts,
        )
        const block = made.find((b) => b.type === 'database')
        if (block) await ensureBlockView(db, saved.databaseId, block.id)
      }
      await addBlocks(db, page.id, tail, opts)
    }

    for (const p of result.pages) {
      const page = await createPage(
        db,
        notebook.id,
        overviewId,
        p.title.slice(0, 200),
      )
      saved.pageIds.push(page.id)
      saved.firstPageId ||= page.id
      await addBlocks(db, page.id, markdownToBlocks(p.body), opts)
    }

    const cards = make.cards ? buildCards(result) : []
    if (cards.length) {
      const page = await createPage(
        db,
        notebook.id,
        overviewId,
        t('prompts.cardsPage', { title }).slice(0, 200),
      )
      saved.pageIds.push(page.id)
      saved.firstPageId ||= page.id
      const parsed: ParsedNotes = {
        title: '',
        keyPoints: [],
        steps: [],
        mindMap: '',
        cards,
        screenshots: [],
        rest: [],
      }
      await addBlocks(db, page.id, notesToBlocks(parsed), opts)
      await syncCardRecords(db, page.id)
    }
    if (saved.pageIds.length === 0) throw new Error('Nothing to save')
    return saved
  } catch (e) {
    await undoSave(db, saved).catch(() => {})
    throw e
  }
}

/** Takes a saved result away: its pages, its database, and a notebook made for it. */
export async function undoSave(
  db: LearningNotesDB,
  saved: Saved,
): Promise<void> {
  if (saved.newNotebook) {
    await deleteNotebook(db, saved.notebookId)
    return
  }
  if (saved.databaseId) await deleteDatabase(db, saved.databaseId)
  for (const id of saved.pageIds) {
    const page = await db.pages.get(id)
    // A child page goes with its parent; deleted twice would throw.
    if (page && page.deletedAt === null) await deletePage(db, id)
  }
}
