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
  'bar.newLine': { where: 'Page › main bar › ↵ New line' },
  'bar.menu': { where: 'Page › main bar › ⋯ menu' },
  'bar.tools': {
    where: 'Page › main bar › the tools (Text, Pen, Highlighter …)',
  },
  'pill.grip': { where: 'Page › options pill › ⠿ grip at its start' },
  'pill.pin': { where: 'Page › options pill › 📌 pin' },
  'writePad.insert': { where: 'Page › Write pad › Insert' },
  'writePad.replace': { where: 'Page › Write pad › Replace' },
  'writePad.zoom': { where: 'Page › Write pad › A− A+ (writing zoom)' },
  'writePad.resize': { where: 'Page › Write pad › its top edge (drag)' },
  'writePad.keys': { where: 'Page › Write pad › ␣ ↵ ⌫' },
  'writePad.engine': { where: 'Page › Write pad › Scribble / AI' },
  'writePad.ai.read': { where: 'Page › Write pad › AI › Read' },
  'writePad.clear': { where: 'Page › Write pad › Clear' },
  'writePad.done': { where: 'Page › Write pad › Done' },
  'writePad.eraser': { where: 'Page › Write pad › AI › Eraser' },
  'writePad.close': { where: 'Page › Write pad › ✕' },
  'writePad.live': { where: 'Page › Write pad › Show my writing on the page' },
  'ai.modelOrder': { where: 'Settings › AI › Models (heading)' },
  'ink.layers': { where: 'Page › Pen, Highlighter or Lasso card › Layers' },
  'ink.finger': { where: 'Page › Pen card › Pen settings › Finger can draw' },
  'ribbon.behaviour': {
    where: 'Page › ribbon › Tools close after use / stay open',
  },
  'bar.handle': { where: 'Page › floating bar › ⠿ handle' },
  'ribbon.options': { where: 'Page › ribbon › ⋯ Ribbon options' },
  'theme.list': {
    where: 'Page › ribbon View › Theme › arrow; short bar Read set',
  },
  'tool.copyPaste': { where: 'Page › ribbon Home › Copy & paste' },
  'path.sep': { where: 'Top bar › full page path › the arrow between parts' },
  'topBar.deviceMode': { where: 'Top bar › Device mode button (right side)' },
  'sidebar.calendar': { where: 'Sidebar › Calendar' },
  'math.palette': {
    where: 'Maths editor › the symbol buttons (fractions, Greek letters …)',
  },
  'newPage.always': {
    where: 'New blank page › template list › Always start new pages as Study',
  },
  'calendar.nav': { where: 'Calendar › ‹ Today › (previous, today, next)' },
  'sidebar.favourites': { where: 'Sidebar › Favourites heading' },
  'sidebar.recent': { where: 'Sidebar › Recent heading' },
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
  'paper.zoomIn': { where: 'A page › the zoom pill under the paper › +' },
  'paper.zoomOut': { where: 'A page › the zoom pill under the paper › −' },
  'paper.zoomFit': { where: 'A page › the zoom pill under the paper › %' },
  'paper.sheetThumb': {
    where: 'Left panel › Pages › under the open page (long pages) › a sheet',
  },
  'sidebar.rowMenu': { where: 'Sidebar › a row’s ⋯ (touch and Pencil)' },
  'sidebar.rename': { where: 'Sidebar › a notebook’s ✎ (on hover)' },
  'sidebar.deleteNotebook': { where: 'Sidebar › a notebook’s × (on hover)' },
  'sidebar.addSubPage': { where: 'Sidebar › a page’s + (on hover)' },
  'sidebar.moveUp': { where: 'Sidebar › a page’s ↑ (on hover)' },
  'sidebar.moveDown': { where: 'Sidebar › a page’s ↓ (on hover)' },
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
  'sidebar.settings': { where: 'Quiet corner › Settings' },
  'sidebar.spaces': {
    where: 'The strip of spaces (left edge, bottom on a phone)',
  },
  'sidebar.corner': { where: 'Strip › ⚙ quiet corner' },
  'sidebar.theme': { where: 'Quiet corner › Day / Night / Sepia buttons' },
  'notebook.tabNotes': { where: 'Notebook › Notes tab' },
  'notebook.tabDatabase': { where: 'Notebook › Database tab' },
  'notebook.tabCards': { where: 'Notebook › Cards tab' },
  'notebook.tabOptions': { where: 'Notebook › ⋯ beside the tabs' },
  'notebook.viewMenu': { where: 'Notebook › Notes tab › View' },
  'notebook.layoutMenu': { where: 'Notebook › Notes tab › Layout' },
  'notebook.close': { where: 'Notebook › × (top right)' },
  'page.reviewPage': { where: 'Page › ⋯ › Review this page' },
  'page.saveTemplate': { where: 'Page › ⋯ › Save as template' },
  'page.history': { where: 'Page › ⋯ › History' },
  'page.import': { where: 'Page › ⋯ › Import (coming soon)' },
  'page.export': { where: 'Page › ⋯ › Export' },
  'page.addTag': { where: 'Page › + Add tag (under the title)' },
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
  'sidebar.allSummaries': { where: 'Sidebar › All summaries' },
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
  'notebook.tabSummary': { where: 'Notebook › Summary tab' },
  'summary.remove': { where: 'Summary › × on a line' },
  'summary.goto': { where: 'Summary › Go to the note (↗)' },
  'sidebar.data': { where: 'Quiet corner › Save & restore' },
  'data.export': { where: 'Save & restore › Save file' },
  'data.exportAll': { where: 'Save & restore › Save everything' },
  'data.ankiImport': { where: 'Save & restore › Anki › Import' },
  'data.ankiExport': { where: 'Save & restore › Anki › Save for Anki' },
  'data.import': { where: 'Save & restore › Restore › Open saved file' },
  'data.restore': { where: 'Save & restore › Bring back' },
  'data.exportNotes': { where: 'Save & restore › Save notes only' },
  'data.undoRestore': { where: 'Save & restore › Undo restore' },
  'data.sample': { where: 'Save & restore › Load sample notebook' },
  'data.sampleRemove': { where: 'Save & restore › Remove sample notebook' },
  'notebook.databasePicker': {
    where: 'Notebook › Database tab › database buttons',
  },
  'home.tick': {
    where: 'Home › task, habit and Top 3 rows › the round tick box',
  },
  'home.planPrev': { where: 'Home › Plan tab › ‹ previous day' },
  'home.planNext': { where: 'Home › Plan tab › › next day' },
  'home.affirmPlay': { where: 'Home › Routines › ▶ play an affirmation' },
  'home.remove': { where: 'Home › Top 3, projects and habits › × remove' },
  'home.taskMenu': { where: 'Home › task row › ⋯ menu' },
  'home.timerStop': { where: 'Home › timer chip › ⏹ stop' },
  'annot.colourFilter': { where: 'Reader › Highlights panel › colour dots' },
  'annot.highlightColour': { where: 'Reader › selection pop-up › colour dots' },
  'reader.close': { where: 'Book reader › top bar › ✕ close' },
  'reader.zoomOut': { where: 'Book reader (PDF) › top bar › −' },
  'reader.fitWidth': { where: 'Book reader (PDF) › top bar › zoom percent' },
  'reader.zoomIn': { where: 'Book reader (PDF) › top bar › +' },
  'reader.askAi': { where: 'Book reader › top bar › Ask AI (when AI is on)' },
  'reader.prev': { where: 'Book reader (EPUB) › top bar › ‹' },
  'reader.next': { where: 'Book reader (EPUB) › top bar › ›' },
  'reader.smaller': { where: 'Book reader (EPUB) › top bar › A−' },
  'reader.larger': { where: 'Book reader (EPUB) › top bar › A+' },
  'reader.bookmark': { where: 'Book reader › top bar › ☆ bookmark' },
  'pic.zoomOut': { where: 'Picture editor › crop sheet › −' },
  'pic.zoomIn': { where: 'Picture editor › crop sheet › +' },
  'library.cardMenu': {
    where: 'Library › a book card › ⋯ (also press and hold the card)',
  },
  'audio.panelClose': { where: 'Audio panel › ✕ close' },
} as const satisfies Record<string, TipDefinition>

export const HELP_LINES = {
  'tracker.table': { where: 'Study tracker › under the table' },
  'tracker.levels': { where: 'Study tracker › under the table, second line' },
  'tracker.board': { where: 'Study tracker › above the board' },
  'tracker.statusRule': {
    where: 'Study tracker › inside the Status menu (how Auto works)',
  },
  'math.latex': { where: 'Maths editor › under the LaTeX box' },
  'review.ratings': {
    where: 'Review › under the Again / Hard / Good / Easy buttons',
  },
  'review.practice': { where: 'Review › under Practice anyway' },
  'db.table': { where: 'Database (not the Study tracker) › under the table' },
  'revise.how': { where: 'Notebook › Revise tab › top' },
  'lock.privacy': { where: 'Lock screen and Settings › Lock › top' },
  'reading.aloud': { where: 'Reading mode › Read aloud panel › top' },
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
    'Every hover tip and help line in the app (shown while Settings › Show help is On). Generated from `src/help/helpRegistry.ts` and `src/i18n/en/` and `src/i18n/en/late/`; to change a text, edit it in the feature file there, then run `UPDATE_HELP=1 npx vitest run src/help` to refresh this file.',
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
