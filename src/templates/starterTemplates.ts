import type { JsonObject } from '../core/types'
import { plainText } from '../editor/mapping'
import { t } from '../i18n/t'

/**
 * Starter templates, created once per workspace. General building blocks
 * for any field (no profession-specific features). All are editable; all
 * but "Daily journal" can be deleted.
 */

export interface StarterBlock {
  type: string
  content: JsonObject
}
export interface StarterPage {
  title: string
  blocks: StarterBlock[]
}
export interface StarterTemplate extends StarterPage {
  /** 'daily' marks the protected template that fills new journal days. */
  role?: 'daily'
  /** Starter version that added this template (unset = 1, the originals). */
  since?: number
  /** Sub-pages, copied along with the template. */
  children?: StarterPage[]
}

/**
 * Bump when adding starter templates (and set their `since`). Existing
 * workspaces get the new ones once; deleted ones never come back.
 */
export const STARTER_VERSION = 2

const heading = (text: string): StarterBlock => ({
  type: 'heading',
  content: { level: 2, text: plainText(text) },
})
const paragraph = (): StarterBlock => ({
  type: 'paragraph',
  content: { text: plainText('') },
})
const bullet = (): StarterBlock => ({
  type: 'bulletListItem',
  content: { text: plainText('') },
})
const todo = (): StarterBlock => ({
  type: 'checkListItem',
  content: { checked: false, text: plainText('') },
})
const quote = (): StarterBlock => ({
  type: 'quote',
  content: { text: plainText('') },
})
const callout = (text: string): StarterBlock => ({
  type: 'callout',
  content: { emoji: '💡', text: plainText(text) },
})
/** Live list of the page's cards (and its sub-pages' with includeSubpages). */
const cardList = (includeSubpages = false): StarterBlock => ({
  type: 'cardList',
  content: { includeSubpages },
})
/** Link to the template's sub-page number `childIndex` (set when seeding). */
const childLink = (childIndex: number): StarterBlock => ({
  type: 'pageLink',
  content: { childIndex },
})

/** Built when seeding, so titles use the language active at that time. */
export const starterTemplates = (): StarterTemplate[] => [
  {
    title: 'Daily journal',
    role: 'daily',
    blocks: [
      heading('Today I learned'),
      paragraph(),
      heading('What was hard'),
      paragraph(),
      heading('Review tomorrow'),
      todo(),
      callout('One sentence worth remembering:'),
    ],
  },
  {
    title: 'Study notes',
    blocks: [
      heading('Topic'),
      paragraph(),
      heading('Key ideas'),
      bullet(),
      heading('Questions'),
      bullet(),
      heading('Summary in my own words'),
      paragraph(),
    ],
  },
  {
    title: 'Meeting notes',
    blocks: [
      heading('Attendees'),
      bullet(),
      heading('Agenda'),
      bullet(),
      heading('Decisions'),
      bullet(),
      heading('Action items'),
      todo(),
    ],
  },
  {
    title: 'Reading notes',
    blocks: [
      heading('Source'),
      paragraph(),
      heading('Highlights'),
      quote(),
      heading('My thoughts'),
      paragraph(),
      heading('Ideas to try'),
      todo(),
    ],
  },
  {
    title: 'Project plan',
    blocks: [
      heading('Goal'),
      paragraph(),
      heading('Milestones'),
      todo(),
      heading('Risks'),
      bullet(),
      heading('Next step'),
      todo(),
    ],
  },
  {
    title: t('templates.lesson'),
    since: 2,
    blocks: [
      heading(t('templates.lesson.notes')),
      paragraph(),
      heading(t('templates.lesson.summary')),
      bullet(),
      heading(t('templates.lesson.cards')),
      cardList(),
    ],
  },
  {
    title: t('templates.lessonLarge'),
    since: 2,
    blocks: [
      heading(t('templates.lesson.overview')),
      paragraph(),
      childLink(0),
      childLink(1),
      childLink(2),
      heading(t('templates.lesson.allCards')),
      cardList(true),
    ],
    children: [
      { title: t('templates.lesson.notes'), blocks: [paragraph()] },
      { title: t('templates.lesson.summary'), blocks: [bullet()] },
      { title: t('templates.lesson.cards'), blocks: [cardList()] },
    ],
  },
]
