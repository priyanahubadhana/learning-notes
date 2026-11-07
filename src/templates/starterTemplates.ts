import type { JsonObject } from '../core/types'
import { plainText } from '../editor/mapping'
import { t, type MessageKey } from '../i18n/t'
import { DIGIT_SOUNDS } from '../memory/majorSystem'

/**
 * Starter templates, created once per workspace. General building blocks
 * for any field (no profession-specific features). All are editable; all
 * but "Daily journal" can be deleted.
 */

export interface StarterBlock {
  type: string
  content: JsonObject
  /** Nested blocks (a card's answer). */
  children?: StarterBlock[]
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
export const STARTER_VERSION = 3

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
  ...memoryTemplates(),
]

/**
 * A worked example in grey (item 10): a beginner sees what to type. It is an
 * ordinary line, so deleting it (and Undo) works like any text.
 */
const example = (s: string): StarterBlock => ({
  type: 'paragraph',
  content: {
    text: [
      {
        type: 'text',
        text: `${t('templates.mem.example')} ${s}`,
        styles: { textColor: 'gray', italic: true },
      },
    ],
  },
})
const text = (s: string): StarterBlock => ({
  type: 'paragraph',
  content: { text: plainText(s) },
})
const bulletText = (s: string): StarterBlock => ({
  type: 'bulletListItem',
  content: { text: plainText(s) },
})
/** A Card block with an empty question, optionally with answer blocks. */
const card = (children: StarterBlock[] = []): StarterBlock => ({
  type: 'card',
  content: { text: plainText('') },
  children,
})
/** An empty picture block (pick a picture or paste one). */
const picture = (): StarterBlock => ({
  type: 'image',
  content: { url: '', caption: '' },
})

/** "How to use" and the honest evidence line every technique page starts with. */
const howTo = (
  how: MessageKey,
  evidence: MessageKey,
  extra: StarterBlock[] = [],
): StarterBlock[] => [
  heading(t('templates.mem.how')),
  text(t(how)),
  ...extra,
  callout(t(evidence)),
]

/** Memory techniques (E2): templates only, each with How to use and evidence. */
function memoryTemplates(): StarterTemplate[] {
  return [
    {
      title: t('templates.mem.palace'),
      since: 3,
      blocks: [
        ...howTo('templates.mem.palace.how', 'templates.mem.palace.evidence'),
        example(t('templates.mem.palace.example')),
        ...[1, 2, 3].flatMap((n) => [
          heading(t('templates.mem.room', { n })),
          card(),
        ]),
      ],
    },
    {
      title: t('templates.mem.vivid'),
      since: 3,
      blocks: [
        ...howTo('templates.mem.vivid.how', 'templates.mem.vivid.evidence'),
        example(t('templates.mem.vivid.example')),
        heading(t('templates.mem.vivid.card')),
        card([picture(), text(t('templates.mem.vivid.note'))]),
      ],
    },
    {
      title: t('templates.mem.major'),
      since: 3,
      blocks: [
        ...howTo(
          'templates.mem.major.how',
          'templates.mem.major.evidence',
          DIGIT_SOUNDS.map((sounds, digit) =>
            bulletText(`${digit} · ${sounds}`),
          ),
        ),
        heading(t('templates.mem.major.mine')),
        example(t('templates.mem.major.example')),
        bullet(),
      ],
    },
    {
      title: t('templates.mem.pao'),
      since: 3,
      blocks: [
        ...howTo('templates.mem.pao.how', 'templates.mem.pao.evidence'),
        heading(t('templates.mem.pao.table')),
        example(t('templates.mem.pao.example')),
        paragraph(),
      ],
    },
    {
      title: t('templates.mem.acronym'),
      since: 3,
      blocks: [
        ...howTo('templates.mem.acronym.how', 'templates.mem.acronym.evidence'),
        heading(t('templates.mem.acronym.list')),
        example(t('templates.mem.acronym.example')),
        bullet(),
        heading(t('templates.mem.acronym.word')),
        card(),
      ],
    },
    {
      title: t('templates.mem.story'),
      since: 3,
      blocks: [
        ...howTo('templates.mem.story.how', 'templates.mem.story.evidence'),
        heading(t('templates.mem.story.words')),
        example(t('templates.mem.story.example')),
        bullet(),
        heading(t('templates.mem.story.story')),
        paragraph(),
        card(),
      ],
    },
  ]
}
