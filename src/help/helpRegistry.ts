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
  'sidebar.today': { where: 'Sidebar › Today button' },
  'sidebar.search': { where: 'Sidebar › Search' },
  'sidebar.review': {
    where: 'Sidebar › Review (the number is how many cards are due)',
  },
  'sidebar.newNotebook': { where: 'Sidebar › Notebooks › +' },
  'sidebar.notebook': { where: 'Sidebar › a notebook’s name' },
  'sidebar.addPage': { where: 'Sidebar › a notebook’s + (on hover)' },
  'sidebar.reviewNotebook': { where: 'Sidebar › a notebook’s ⟳ (on hover)' },
  'sidebar.rename': { where: 'Sidebar › a notebook’s ✎ (on hover)' },
  'sidebar.deleteNotebook': { where: 'Sidebar › a notebook’s × (on hover)' },
  'sidebar.addSubPage': { where: 'Sidebar › a page’s + (on hover)' },
  'sidebar.moveTop': { where: 'Sidebar › a sub-page’s ↰ (on hover)' },
  'sidebar.deletePage': { where: 'Sidebar › a page’s × (on hover)' },
  'sidebar.newTemplate': { where: 'Sidebar › Templates › +' },
  'sidebar.deleteTemplate': { where: 'Sidebar › a template’s × (on hover)' },
  'sidebar.restore': { where: 'Sidebar › Trash › ↺ (on hover)' },
  'sidebar.deleteForever': { where: 'Sidebar › Trash › × (on hover)' },
  'sidebar.newTag': { where: 'Sidebar › Tags › +' },
  'sidebar.tagOptions': { where: 'Sidebar › a tag’s ⋯ (on hover)' },
  'sidebar.savedReview': { where: 'Sidebar › Saved searches › ⟳ (on hover)' },
  'sidebar.savedRename': { where: 'Sidebar › Saved searches › ✎ (on hover)' },
  'sidebar.savedDelete': { where: 'Sidebar › Saved searches › × (on hover)' },
  'sidebar.settings': { where: 'Sidebar › Settings' },
  'sidebar.theme': { where: 'Sidebar › Day / Night / Sepia buttons' },
  'notebook.tabNotes': { where: 'Notebook › Notes tab' },
  'notebook.tabDatabase': { where: 'Notebook › Database tab' },
  'notebook.tabCards': { where: 'Notebook › Cards tab' },
  'notebook.tabOptions': { where: 'Notebook › ⋯ beside the tabs' },
  'notebook.close': { where: 'Notebook › × (top right)' },
  'page.reviewPage': { where: 'Page › ⋯ › Review this page' },
  'page.saveTemplate': { where: 'Page › ⋯ › Save as template' },
  'page.history': { where: 'Page › ⋯ › History' },
  'page.import': { where: 'Page › ⋯ › Import (coming soon)' },
  'page.export': { where: 'Page › ⋯ › Export (coming soon)' },
  'page.addTag': { where: 'Page › + Add tag (under the title)' },
  'page.sections': { where: 'Page › the chips at the top of a long page' },
  'review.show': { where: 'Review › Show answer' },
  'review.ratings': { where: 'Review › Again / Hard / Good / Easy' },
  'review.scope': { where: 'Review › All / Got wrong switch' },
  'review.practice': { where: 'Review › Practice anyway' },
  'review.close': { where: 'Review › × (top right)' },
  'search.types': { where: 'Search › All / Notes / Cards / … chips' },
  'search.save': { where: 'Search › Save this search' },
  'search.reviewCards': { where: 'Search › Review these cards' },
  'search.removeEmpty': { where: 'Search › Remove empty cards' },
  'db.viewTable': { where: 'Database › Table view button' },
  'db.viewDashboard': { where: 'Database › Dashboard view button' },
  'db.viewBoard': { where: 'Database › Board view button' },
  'db.viewOptions': { where: 'Database › ⋯ beside the views' },
  'db.addColumn': { where: 'Database › + Column' },
  'db.column': { where: 'Database › a column header' },
  'db.newRow': { where: 'Database › + New row' },
  'db.addChart': { where: 'Dashboard › + Add chart' },
  'db.chartMenu': { where: 'Dashboard › ⋯ on a chart' },
  'db.groupedBy': { where: 'Board › Grouped by …' },
  'db.cardShows': { where: 'Board › Card shows' },
  'review.openNote': { where: 'Review › Open note (under the card)' },
  'review.suspend': { where: 'Review › Suspend (under the card)' },
  'cards.sort': { where: 'Cards tab › Sort button' },
  'cards.review': { where: 'Cards tab › Review N due / Practice' },
  'sidebar.dailyTemplate': { where: 'Sidebar › Templates › Daily journal' },
  'sidebar.tag': { where: 'Sidebar › a tag’s name' },
  'page.tagChip': { where: 'Page › a tag under the title' },
  'sidebar.allCards': { where: 'Sidebar › All cards' },
  'sidebar.allDatabases': { where: 'Sidebar › Databases' },
  'databases.new': { where: 'All databases › + New database' },
  'db.blockViews': {
    where: 'A database inside a note › Table / Dashboard / Board',
  },
  'db.blockOpen': { where: 'A database inside a note › Open' },
  'db.blockWide': { where: 'A database inside a note › Full width' },
  'db.viewCalendar': { where: 'Database › Calendar view button' },
  'db.viewGallery': { where: 'Database › Gallery view button' },
  'db.addView': { where: 'Database › + View' },
  'db.calendarNav': { where: 'Calendar › ‹ Today ›' },
  'db.galleryOptions': { where: 'Gallery › Gallery options' },
  'revise.practice': { where: 'Revise tab › Practise this lesson' },
  'notebook.tabRevise': { where: 'Notebook › Revise tab' },
  'sidebar.data': { where: 'Sidebar › Backup & files' },
  'data.export': { where: 'Backup & files › Save file' },
  'data.exportAll': { where: 'Backup & files › Save everything' },
  'data.ankiImport': { where: 'Backup & files › Anki › Import' },
  'data.ankiExport': { where: 'Backup & files › Anki › Save for Anki' },
  'data.import': { where: 'Backup & files › Restore backup' },
  'data.restore': { where: 'Backup & files › Restore as copies' },
  'data.sample': { where: 'Backup & files › Load sample notebook' },
  'data.sampleRemove': { where: 'Backup & files › Remove sample notebook' },
  'notebook.databasePicker': {
    where: 'Notebook › Database tab › database buttons',
  },
} as const satisfies Record<string, TipDefinition>

export const HELP_LINES = {
  'tracker.table': { where: 'Study tracker › under the table' },
  'tracker.levels': { where: 'Study tracker › under the table, second line' },
  'tracker.board': { where: 'Study tracker › above the board' },
  'tracker.statusRule': {
    where: 'Study tracker › inside the Status menu (how Auto works)',
  },
  'page.editor': { where: 'Page › under the title' },
  'review.ratings': {
    where: 'Review › under the Again / Hard / Good / Easy buttons',
  },
  'review.practice': { where: 'Review › under Practice anyway' },
  'db.table': { where: 'Database (not the Study tracker) › under the table' },
  'revise.how': { where: 'Notebook › Revise tab › top' },
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
