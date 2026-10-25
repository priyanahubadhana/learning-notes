import type { JsonObject } from '../core/types'
import { plainText } from '../editor/mapping'

/**
 * Starter templates, created once per workspace. General building blocks
 * for any field (no profession-specific features). All are editable; all
 * but "Daily journal" can be deleted.
 */

export interface StarterBlock {
  type: string
  content: JsonObject
}
export interface StarterTemplate {
  title: string
  /** 'daily' marks the protected template that fills new journal days. */
  role?: 'daily'
  blocks: StarterBlock[]
}

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

export const STARTER_TEMPLATES: StarterTemplate[] = [
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
]
