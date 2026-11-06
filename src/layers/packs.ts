import { createBlock } from '../core/blockService'
import { LearningNotesDB } from '../core/db'
import { getOrCreateDefaultWorkspace } from '../core/workspaceService'
import type { JsonObject } from '../core/types'
import {
  addColumn,
  addRows,
  createDatabase,
  listColumns,
} from '../databases/databaseService'
import { plainText } from '../editor/mapping'
import { t, type MessageKey } from '../i18n/t'
import { createNotebook } from '../notebooks/notebookService'
import { createPage } from '../pages/pageService'
import { syncCardRecords } from '../recall/cardService'
import { exportNotebookBundle } from '../share/bundle'
import type { LayerFile, LayerManifest } from './manifest'

/**
 * I2 · The starter layers. Each is made the way you would make it by hand:
 * the pack builds its notebook with the app's own services in a short-lived
 * scratch database, then exports it as an ordinary notebook file. Nothing
 * about a pack is special once it is added.
 *
 * Page text is English (like the starter templates); the names and lines
 * shown in the gallery follow the chosen language.
 */

export const STARTER_IDS = [
  'finance-tracker',
  'memory-kit',
  'study-kit',
] as const
export type StarterId = (typeof STARTER_IDS)[number]

/** Bump a pack's version when its content changes. */
const VERSIONS: Record<StarterId, number> = {
  'finance-tracker': 1,
  'memory-kit': 1,
  'study-kit': 1,
}

type Builder = (
  db: LearningNotesDB,
  workspaceId: string,
) => Promise<{ notebookId: string }>

const heading = (text: string): JsonObject => ({
  level: 2,
  text: plainText(text),
})
const body = (text: string): JsonObject => ({ text: plainText(text) })

interface PageSpec {
  title: string
  blocks: (string | { h: string } | { q: string; a: string })[]
  children?: PageSpec[]
}

/** Makes a page tree: text lines, headings and cards (question + answer). */
async function makePages(
  db: LearningNotesDB,
  notebookId: string,
  specs: PageSpec[],
  parentId: string | null = null,
): Promise<void> {
  for (const spec of specs) {
    const page = await createPage(db, notebookId, parentId, spec.title)
    for (const item of spec.blocks) {
      if (typeof item === 'string') {
        await createBlock(db, {
          pageId: page.id,
          type: 'paragraph',
          content: body(item),
        })
      } else if ('h' in item) {
        await createBlock(db, {
          pageId: page.id,
          type: 'heading',
          content: heading(item.h),
        })
      } else {
        const card = await createBlock(db, {
          pageId: page.id,
          type: 'card',
          content: body(item.q),
        })
        await createBlock(db, {
          pageId: page.id,
          type: 'paragraph',
          parentId: card.id,
          content: body(item.a),
        })
      }
    }
    await syncCardRecords(db, page.id, Date.now())
    if (spec.children) await makePages(db, notebookId, spec.children, page.id)
  }
}

const BUILDERS: Record<StarterId, Builder> = {
  'finance-tracker': async (db, workspaceId) => {
    const notebook = await createNotebook(db, workspaceId, 'Finance tracker')
    await makePages(db, notebook.id, [
      {
        title: 'How to use this tracker',
        blocks: [
          { h: 'Three steps' },
          'Add each payment or income as a row in the Transactions table (Database tab).',
          'Use the Category column so the Dashboard can show where money goes.',
          'Once a month, write a short review on the Monthly review page.',
        ],
      },
      {
        title: 'Monthly review',
        blocks: [
          { h: 'What came in, what went out' },
          'Total income: ',
          'Total spending: ',
          { h: 'One thing to change next month' },
          '',
        ],
      },
    ])
    const transactions = await createDatabase(
      db,
      workspaceId,
      notebook.id,
      'Transactions',
    )
    await db.databases.update(transactions.id, { titleName: 'What for' })
    await addColumn(db, transactions.id, { name: 'Date', type: 'date' })
    await addColumn(db, transactions.id, { name: 'Amount', type: 'number' })
    await addColumn(db, transactions.id, {
      name: 'Category',
      type: 'choice',
      config: {
        options: [
          { id: 'food', name: 'Food', color: '#2e9e6b' },
          { id: 'travel', name: 'Travel', color: '#2f6feb' },
          { id: 'study', name: 'Study', color: '#8a5cf6' },
          { id: 'fun', name: 'Fun', color: '#c2417f' },
          { id: 'income', name: 'Income', color: '#d9822b' },
        ],
      },
    })
    const [date, amount, category] = await listColumns(db, transactions.id)
    const day = (by: number) => {
      const d = new Date()
      d.setDate(d.getDate() - by)
      const pad = (n: number) => String(n).padStart(2, '0')
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
    }
    await addRows(db, transactions.id, [
      {
        title: 'Example: pocket money',
        values: {
          [date.id]: day(6),
          [amount.id]: 2000,
          [category.id]: 'income',
        },
      },
      {
        title: 'Example: lunch',
        values: { [date.id]: day(4), [amount.id]: -120, [category.id]: 'food' },
      },
      {
        title: 'Example: textbook',
        values: {
          [date.id]: day(2),
          [amount.id]: -450,
          [category.id]: 'study',
        },
      },
    ])
    return { notebookId: notebook.id }
  },

  'memory-kit': async (db, workspaceId) => {
    const notebook = await createNotebook(db, workspaceId, 'Memory techniques')
    await makePages(db, notebook.id, [
      {
        title: 'Start here',
        blocks: [
          { h: 'Why pictures beat words' },
          'The brain keeps strange, vivid pictures far better than plain facts. Each technique here turns a fact into a picture.',
          'Try one technique on one small list today, then use the cards to check it tomorrow.',
        ],
      },
      {
        title: 'Memory palace (method of loci)',
        blocks: [
          { h: 'Steps' },
          'Pick a place you know well, such as your home.',
          'Choose a fixed route: door, hall, kitchen, bedroom, balcony.',
          'Put one picture of each item on each stop, and make it loud and silly.',
          'Walk the route in your head to recall the list in order.',
          {
            q: 'What is the first step of a memory palace?',
            a: 'Pick a place you know very well.',
          },
          {
            q: 'Why use a fixed route?',
            a: 'The stops keep the items in order.',
          },
        ],
      },
      {
        title: 'Acronyms and chunks',
        blocks: [
          { h: 'Make one word from the first letters' },
          'Example: HOMES for the Great Lakes (Huron, Ontario, Michigan, Erie, Superior).',
          {
            q: 'What is an acronym used for in memory?',
            a: 'One easy word stands for the first letters of a list.',
          },
        ],
      },
      {
        title: 'Spaced practice',
        blocks: [
          { h: 'Little and often' },
          'Review a fact just before you would forget it. The cards in this notebook are scheduled for you.',
          {
            q: 'Why review cards a little at a time over days?',
            a: 'Each review just before forgetting makes the memory last longer.',
          },
        ],
      },
    ])
    return { notebookId: notebook.id }
  },

  'study-kit': async (db, workspaceId) => {
    const notebook = await createNotebook(db, workspaceId, 'Study kit')
    await makePages(db, notebook.id, [
      {
        title: 'Weekly plan',
        blocks: [
          { h: 'This week' },
          'Three things I must finish: ',
          'Two things I will review: ',
          'One thing I will start: ',
        ],
        children: [
          {
            title: 'Exam checklist',
            blocks: [
              { h: 'Before the exam' },
              'All topics listed and marked easy, medium or hard.',
              'Past questions tried.',
              'Cards reviewed every day for a week.',
              'Bag, pens and ID ready the night before.',
            ],
          },
        ],
      },
      {
        title: 'Cornell notes',
        blocks: [
          { h: 'Questions (left)' },
          'Write the questions here while you listen.',
          { h: 'Notes (right)' },
          'Write the answers and key facts here.',
          { h: 'Summary (bottom)' },
          'In two sentences, what was this lesson about?',
        ],
      },
      {
        title: 'Feynman check',
        blocks: [
          { h: 'Explain it to a ten-year-old' },
          'Write the idea in simple words, without jargon.',
          'Mark every place where you got stuck, then go back to the source.',
          {
            q: 'What does the Feynman check show you?',
            a: 'The places where you do not really understand yet.',
          },
        ],
      },
    ])
    return { notebookId: notebook.id }
  },
}

/** The gallery text of a starter, in the chosen language. */
export function starterManifest(id: StarterId): LayerManifest {
  const key = (part: string) => `layers.${id}.${part}` as MessageKey
  return {
    id,
    version: VERSIONS[id],
    name: t(key('name')),
    description: t(key('desc')),
    adds: [t(key('add1')), t(key('add2')), t(key('add3'))],
  }
}

/** Builds a starter as a layer file (in a scratch database that is then deleted). */
export async function buildStarter(id: StarterId): Promise<LayerFile> {
  const name = `layer-scratch-${crypto.randomUUID()}`
  const scratch = new LearningNotesDB(name)
  try {
    const workspace = await getOrCreateDefaultWorkspace(scratch)
    const { notebookId } = await BUILDERS[id](scratch, workspace.id)
    const bundle = await exportNotebookBundle(scratch, notebookId)
    return { manifest: starterManifest(id), bundle }
  } finally {
    scratch.close()
    await LearningNotesDB.delete(name)
  }
}
