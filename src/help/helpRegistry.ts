import { t, type MessageKey } from '../i18n/t'

/**
 * Every hover tip and help line in the app. Each one has an id, a note on
 * where it appears (for the owner's review list, `HELP-TEXTS.md`) and its
 * texts in `i18n/en.ts` (`help.tip.<id>.meaning` / `.example`,
 * `help.line.<id>`). Add a tip by adding an entry here and its texts.
 *
 * A tip can later get a picture: set `image` to a file under `public/help/`
 * and the tip shows it above the text.
 */

export interface TipDefinition {
  /** Where the tip shows (plain words, for the review list). */
  where: string
  /** Optional picture shown in the tip (path under public/). */
  image?: string
}

export interface HelpLineDefinition {
  where: string
}

export const TIPS = {
  'tracker.lesson': { where: 'Study tracker › Lesson column header' },
  'tracker.status': { where: 'Study tracker › Status column header' },
  'tracker.status.notStarted': {
    where: 'Study tracker › the “Not started” pill, board column and menu item',
  },
  'tracker.status.learning': {
    where: 'Study tracker › the “Learning” pill, board column and menu item',
  },
  'tracker.status.review': {
    where: 'Study tracker › the “Review” pill, board column and menu item',
  },
  'tracker.status.mastered': {
    where: 'Study tracker › the “Mastered” pill, board column and menu item',
  },
  'tracker.pin': { where: 'Study tracker › the 📌 next to a status you set' },
  'tracker.lastRevised': {
    where: 'Study tracker › Last revised column header',
  },
  'tracker.cardsDue': { where: 'Study tracker › Cards due column header' },
  'tracker.correct': { where: 'Study tracker › % correct column header' },
  'tracker.levels': { where: 'Study tracker › Card levels column header' },
  'tracker.level.new': {
    where: 'Study tracker › Card levels bar and numbers, “New”',
  },
  'tracker.level.learning': {
    where: 'Study tracker › Card levels bar and numbers, “Learning”',
  },
  'tracker.level.familiar': {
    where: 'Study tracker › Card levels bar and numbers, “Familiar”',
  },
  'tracker.level.mastered': {
    where: 'Study tracker › Card levels bar and numbers, “Mastered”',
  },
  'tracker.confidence': { where: 'Study tracker › Confidence column header' },
  'tracker.newLesson': {
    where: 'Study tracker › “+ New lesson” (table and board)',
  },
  'tracker.chart.streak': {
    where: 'Study tracker › Dashboard › Study streak chart title',
  },
  'tracker.chart.correct': {
    where: 'Study tracker › Dashboard › % correct per week chart title',
  },
  'tracker.chart.days': {
    where: 'Study tracker › Dashboard › Cards answered per day chart title',
  },
} as const satisfies Record<string, TipDefinition>

export const HELP_LINES = {
  'tracker.table': { where: 'Study tracker › under the table' },
  'tracker.levels': { where: 'Study tracker › under the table, second line' },
  'tracker.board': { where: 'Study tracker › above the board' },
  'tracker.statusRule': {
    where: 'Study tracker › inside the Status menu (how Auto works)',
  },
} as const satisfies Record<string, HelpLineDefinition>

export type TipId = keyof typeof TIPS
export type HelpLineId = keyof typeof HELP_LINES

export const tipMeaning = (id: TipId): string =>
  t(`help.tip.${id}.meaning` as MessageKey)
export const tipExample = (id: TipId): string =>
  t(`help.tip.${id}.example` as MessageKey)
export const lineText = (id: HelpLineId): string =>
  t(`help.line.${id}` as MessageKey)
export const tipImage = (id: TipId): string | undefined =>
  (TIPS[id] as TipDefinition).image

/** The review list (`HELP-TEXTS.md`) as text, built from the registry. */
export function helpListMarkdown(): string {
  const tips = (Object.keys(TIPS) as TipId[]).map(
    (id) =>
      `### \`${id}\`\n\n- **Where:** ${TIPS[id].where}\n- **Meaning:** ${tipMeaning(id)}\n- **Example:** ${tipExample(id)}\n`,
  )
  const lines = (Object.keys(HELP_LINES) as HelpLineId[]).map(
    (id) =>
      `### \`${id}\`\n\n- **Where:** ${HELP_LINES[id].where}\n- **Text:** ${lineText(id)}\n`,
  )
  return [
    '# Help texts to review',
    '',
    'Every hover tip and help line in the app (shown while Settings › Show help is On). Generated from `src/help/helpRegistry.ts` and `src/i18n/en.ts`; to change a text, edit it in `en.ts`, then run `UPDATE_HELP=1 npx vitest run src/help` to refresh this file.',
    '',
    `## Hover tips (${tips.length})`,
    '',
    ...tips,
    `## Help lines (${lines.length})`,
    '',
    'Help lines are marked in the page with `data-help-line="<id>"`.',
    '',
    ...lines,
  ].join('\n')
}
