/**
 * English help tips (hover / press-and-hold). Loaded late with enO.ts, not in
 * the first download (first-load size limit). Keys: help.tip.*, help.line.*.
 */
export const enH = {
  'help.tip.tracker.lesson.meaning':
    'Each row is one lesson: a top-level page of this notebook. Its sub-pages count towards it.',
  'help.tip.tracker.lesson.example':
    'Cards on the sub-page “Heart › Valves” count for the lesson “Heart”.',
  'help.tip.tracker.status.meaning':
    'Where this lesson stands. The app works it out from your card answers, or you can set it yourself.',
  'help.tip.tracker.status.example':
    'Not started, Learning, Review or Mastered.',
  'help.tip.tracker.status.notStarted.meaning':
    'You haven’t answered any card of this lesson yet.',
  'help.tip.tracker.status.notStarted.example':
    'A lesson whose cards are all new.',
  'help.tip.tracker.status.learning.meaning':
    'Fewer than 75% of the cards you answered were right.',
  'help.tip.tracker.status.learning.example':
    '6 of 10 answered cards right → 60% → Learning.',
  'help.tip.tracker.status.review.meaning':
    'Mostly right, but not finished: some cards are due, new or still short of Mastered.',
  'help.tip.tracker.status.review.example':
    '85% right, or 95% right with 2 cards due → Review.',
  'help.tip.tracker.status.mastered.meaning':
    '90% or more right, nothing due, no new cards, and at least 80% of the cards at level Mastered.',
  'help.tip.tracker.status.mastered.example':
    '10 cards, all right, 8 or more back only every 21+ days.',
  'help.tip.tracker.pin.meaning':
    'You set this status yourself, so the app leaves it alone. Choose Auto in the menu to hand it back.',
  'help.tip.tracker.pin.example': 'Menu › Auto (now: Review).',
  'help.tip.tracker.lastRevised.meaning':
    'The last time you answered any card of this lesson (a review or Practice anyway).',
  'help.tip.tracker.lastRevised.example':
    'You reviewed one of its cards yesterday → yesterday’s date.',
  'help.tip.tracker.cardsDue.meaning':
    'Cards ready to review now, and new cards you haven’t started.',
  'help.tip.tracker.cardsDue.example': '5 due · 20 new.',
  'help.tip.tracker.correct.meaning':
    'Of the cards you’ve answered, how many your latest answer got right (anything but Again).',
  'help.tip.tracker.correct.example': '8 of 10 answered cards right → 80%.',
  'help.tip.tracker.levels.meaning':
    'How well you know this lesson’s cards, by how far apart their reviews are.',
  'help.tip.tracker.levels.example':
    '3 New · 2 Learning · 4 Familiar · 1 Mastered.',
  'help.tip.tracker.level.new.meaning': 'You haven’t studied this card yet.',
  'help.tip.tracker.level.new.example': 'A card you just made.',
  'help.tip.tracker.level.learning.meaning':
    'You’re still getting it, so it comes back again soon.',
  'help.tip.tracker.level.learning.example':
    'Its next review is less than a day away.',
  'help.tip.tracker.level.familiar.meaning':
    'You mostly know it, and the reviews are getting further apart.',
  'help.tip.tracker.level.familiar.example':
    'Its next review is 1 to 20 days away.',
  'help.tip.tracker.level.mastered.meaning':
    'You know it well, so you’ll only see it every few weeks.',
  'help.tip.tracker.level.mastered.example':
    'Its next review is 21 days or more away.',
  'help.tip.tracker.confidence.meaning':
    'Your own feeling about this lesson, from 1 to 5 stars. The app never changes it.',
  'help.tip.tracker.confidence.example': '★★★☆☆ = fairly sure.',
  'help.tip.tracker.newLesson.meaning':
    'Adds a lesson: a new page at the top of this notebook.',
  'help.tip.tracker.newLesson.example':
    'Add “Kidney”, then write its notes and cards in it.',
  'help.tip.tracker.chart.streak.meaning':
    'How many days in a row you answered at least one card. A day that isn’t over yet doesn’t break it.',
  'help.tip.tracker.chart.streak.example':
    '🔥 5 days = you studied every day since Friday.',
  'help.tip.tracker.chart.correct.meaning':
    'Of all your answers each week, how many were not Again. Every answer counts, even for the same card.',
  'help.tip.tracker.chart.correct.example':
    'A week with 40 answers, 30 of them right → 75%.',
  'help.tip.tracker.chart.days.meaning':
    'Each square is a day. The darker it is, the more cards you answered.',
  'help.tip.tracker.chart.days.example':
    'A dark square = a busy study day; a blank one = a day off.',
  'help.line.tracker.table':
    'Status, Last revised, Cards due, % correct and Card levels fill themselves in from your card reviews. Click a Status to set it yourself 📌.',
  'help.line.tracker.levels':
    'Card levels: New = not studied yet · Learning = comes back within a day · Familiar = back in 1–20 days · Mastered = back in 21+ days.',
  'help.line.tracker.board':
    'Drag a lesson to another column to set its status yourself 📌. Drop it back on its own automatic column to hand it back to Auto.',
  'help.tip.sidebar.today.meaning':
    'Opens today’s journal page. Every day gets its own page, made from the Daily journal template.',
  'help.tip.sidebar.today.example':
    'Write what you learned today; tomorrow you get a fresh page.',
  'help.tip.sidebar.search.meaning':
    'Finds words in all your notes, cards and tags.',
  'help.tip.sidebar.search.example':
    'Type “mitral” to see every note and card that mentions it.',
  'help.tip.sidebar.review.meaning':
    'Starts reviewing the cards that are due today. The badge shows how many are waiting.',
  'help.tip.sidebar.review.example':
    'A badge “12” means 12 cards are ready now.',
  'help.tip.sidebar.newNotebook.meaning':
    'Creates a notebook: one place for all the pages of a subject.',
  'help.tip.sidebar.newNotebook.example':
    'Make a notebook called “Cardiology”.',
  'help.tip.sidebar.notebook.meaning':
    'Opens the notebook (Notes, Database and Cards tabs). Double-click the name to rename it.',
  'help.tip.sidebar.notebook.example':
    'Click “Cardiology” to see its lessons in a table.',
  'help.tip.sidebar.addPage.meaning':
    'Adds a page to this notebook: blank, or from a template.',
  'help.tip.sidebar.addPage.example': 'A new page called “Heart sounds”.',
  'help.tip.sidebar.reviewNotebook.meaning':
    'Reviews only the cards of this notebook that are due.',
  'help.tip.sidebar.reviewNotebook.example':
    'Revise Cardiology without seeing Chemistry cards.',
  'help.tip.sidebar.rename.meaning': 'Changes this notebook’s name.',
  'help.tip.sidebar.rename.example': '“Cardio” → “Cardiology”.',
  'help.tip.sidebar.deleteNotebook.meaning':
    'Moves the notebook and all its pages to the Trash. You can restore it from there.',
  'help.tip.sidebar.deleteNotebook.example':
    'Deleted by mistake? Open Trash and press ↺.',
  'help.tip.sidebar.addSubPage.meaning':
    'Adds a page inside this page, to split a big topic into parts.',
  'help.tip.sidebar.addSubPage.example': '“Valves” inside “Heart sounds”.',
  'help.tip.sidebar.moveUp.meaning':
    'Moves this page one place up among its neighbours.',
  'help.tip.sidebar.moveUp.example': '“Valves” goes above “Murmurs”.',
  'help.tip.sidebar.moveDown.meaning':
    'Moves this page one place down among its neighbours.',
  'help.tip.sidebar.moveDown.example': '“Murmurs” goes below “Valves”.',
  'help.tip.sidebar.moveTop.meaning':
    'Takes this sub-page out of its parent and makes it a page on its own.',
  'help.tip.sidebar.moveTop.example':
    'The sub-page “Valves” becomes its own lesson.',
  'help.tip.sidebar.deletePage.meaning':
    'Moves this page and its sub-pages to the Trash. You can restore them.',
  'help.tip.sidebar.deletePage.example': 'Restore it later from Trash.',
  'help.tip.sidebar.newTemplate.meaning':
    'Creates a template: a page layout you can reuse for new pages.',
  'help.tip.sidebar.newTemplate.example':
    'A “Study notes” layout with Summary and Questions.',
  'help.tip.sidebar.deleteTemplate.meaning':
    'Deletes this template. Pages already made from it stay as they are.',
  'help.tip.sidebar.deleteTemplate.example':
    'Remove a layout you no longer use.',
  'help.tip.sidebar.restore.meaning':
    'Brings this item back from the Trash, with its pages and cards.',
  'help.tip.sidebar.restore.example': 'Restore the page “Heart sounds”.',
  'help.tip.sidebar.deleteForever.meaning':
    'Erases this item for good, with its cards and review history. This cannot be undone.',
  'help.tip.sidebar.deleteForever.example':
    'Clear out things you will never need again.',
  'help.tip.sidebar.newTag.meaning':
    'Creates a tag: a label you can put on pages and cards to find them together.',
  'help.tip.sidebar.newTag.example':
    'Type “medicine/cardiology” to make a tag inside a tag.',
  'help.tip.sidebar.tagOptions.meaning':
    'Rename, move, merge, recolour or delete this tag.',
  'help.tip.sidebar.tagOptions.example': 'Merge “cardio” into “cardiology”.',
  'help.tip.sidebar.savedReview.meaning':
    'Reviews the due cards found by this saved search.',
  'help.tip.sidebar.savedReview.example':
    'A saved search for “Most failed cards” becomes a study deck.',
  'help.tip.sidebar.savedRename.meaning':
    'Changes the name of this saved search.',
  'help.tip.sidebar.savedRename.example': '“Wrong cards” → “Hard ones”.',
  'help.tip.sidebar.savedDelete.meaning':
    'Deletes this saved search. Your notes and cards are not touched.',
  'help.tip.sidebar.savedDelete.example': 'Remove a search you no longer use.',
  'help.tip.sidebar.settings.meaning':
    'Opens Settings: theme, when your day starts, review limits and more.',
  'help.tip.sidebar.settings.example':
    'Turn “Show help” off once you know the app.',
  'help.tip.sidebar.theme.meaning':
    'Changes how the app looks: light, dark, or warm paper.',
  'help.tip.sidebar.theme.example':
    'Night is easier on the eyes in the evening.',
  'help.tip.notebook.tabNotes.meaning':
    'The pages of this notebook, as a list you can open.',
  'help.tip.notebook.tabNotes.example':
    'Open “Heart sounds” to read or edit it.',
  'help.tip.notebook.tabDatabase.meaning':
    'Your Study tracker: one row per lesson, with its status and progress. You can add your own columns.',
  'help.tip.notebook.tabDatabase.example': 'See which lessons still need work.',
  'help.tip.notebook.tabCards.meaning':
    'Every card of this notebook in one list, with when it is due.',
  'help.tip.notebook.tabCards.example':
    'Find a card quickly, or review them all.',
  'help.tip.notebook.tabOptions.meaning':
    'Rename or hide the tabs of this notebook.',
  'help.tip.notebook.tabOptions.example':
    'Hide the Cards tab if you never use it.',
  'help.tip.notebook.close.meaning':
    'Closes the notebook and goes back to your last page.',
  'help.tip.notebook.close.example': 'Back to where you were writing.',
  'help.tip.page.reviewPage.meaning':
    'Reviews the cards of this page that are due, and its sub-pages’ cards.',
  'help.tip.page.reviewPage.example':
    'Revise one lesson right after reading it.',
  'help.tip.page.saveTemplate.meaning':
    'Saves this page’s layout as a template for new pages (its sub-pages too).',
  'help.tip.page.saveTemplate.example':
    'Turn a good lesson page into a reusable layout.',
  'help.tip.page.history.meaning':
    'Shows earlier copies of this page. You can look at one and bring it back.',
  'help.tip.page.history.example':
    'Undo a paragraph you deleted by mistake last week.',
  'help.tip.page.import.meaning':
    'Will bring a file into this page. It arrives in a later phase.',
  'help.tip.page.import.example': 'Import notes from another app.',
  'help.tip.page.export.meaning':
    'Saves or shares this page as a PDF, Word, Markdown or text file.',
  'help.tip.page.export.example': 'Export a lesson as a document.',
  'help.tip.page.addTag.meaning':
    'Puts a tag on this page so you can find it with others.',
  'help.tip.page.addTag.example': 'Tag “Heart sounds” with “cardiology”.',
  'help.tip.review.show.meaning':
    'Reveals the answer. Try to remember it first, then check.',
  'help.tip.review.show.example': 'Press Space to reveal.',
  'help.tip.review.ratings.meaning':
    'Tell the app how well you remembered. The time under each button is when the card comes back.',
  'help.tip.review.ratings.example':
    'Forgot → Again (soon). Knew it easily → Easy (much later).',
  'help.tip.review.scope.meaning':
    'Choose which cards to review: everything due, or only cards you got wrong lately.',
  'help.tip.review.scope.example':
    'Use “Got wrong” to drill the cards you keep missing.',
  'help.tip.review.practice.meaning':
    'Goes through cards that are not due yet, for extra practice. It does not change when they come back.',
  'help.tip.review.practice.example': 'A quick run before an exam.',
  'help.tip.review.close.meaning':
    'Leaves the review. Cards you answered stay answered.',
  'help.tip.review.close.example': 'Stop for today and come back later.',
  'help.tip.search.types.meaning': 'Shows only one kind of result.',
  'help.tip.search.types.example': 'Pick Cards to search only your flashcards.',
  'help.tip.search.save.meaning':
    'Keeps this search in the sidebar so you can open it again in one click.',
  'help.tip.search.save.example':
    'Save “cards tagged cardiology” as a study deck.',
  'help.tip.search.reviewCards.meaning':
    'Reviews the due cards among these results.',
  'help.tip.search.reviewCards.example':
    'Search “valves”, then revise just those cards.',
  'help.tip.search.removeEmpty.meaning':
    'Removes cards that have no question. Their answer lines stay in your notes as normal text.',
  'help.tip.search.removeEmpty.example':
    'Clean up cards you started but never wrote.',
  'help.tip.db.viewTable.meaning':
    'Shows the rows in a table you can edit, sort and filter.',
  'help.tip.db.viewTable.example': 'Fix a value in its cell, or sort a column.',
  'help.tip.db.viewDashboard.meaning':
    'Shows charts and numbers about your rows.',
  'help.tip.db.viewDashboard.example':
    'See how the rows split into groups, as a donut.',
  'help.tip.db.viewBoard.meaning':
    'Shows the rows as cards in columns. Drag a card to change its column.',
  'help.tip.db.viewBoard.example': 'Drag a card from “To do” to “Done”.',
  'help.tip.db.viewOptions.meaning':
    'Choose which view opens first and other view settings.',
  'help.tip.db.viewOptions.example':
    'Open on the Dashboard once there are rows.',
  'help.tip.db.addColumn.meaning':
    'Adds your own column: text, number, date, choice, checkbox and more.',
  'help.tip.db.addColumn.example': 'Add “Exam date” as a Date column.',
  'help.tip.db.column.meaning':
    'Opens the column menu: sort, filter, hide or edit.',
  'help.tip.db.column.example': 'Sort a number column from high to low.',
  'help.tip.db.newRow.meaning':
    'Adds a row (a page you can open and write in).',
  'help.tip.db.newRow.example': 'Add the drug “Amlodipine” to a Drug list.',
  'help.tip.db.addChart.meaning':
    'Adds a chart: a number, bars, a line, a donut, a progress bar or a calendar.',
  'help.tip.db.addChart.example': 'A bar for each row’s number.',
  'help.tip.db.chartMenu.meaning':
    'Edit, move, show as a table, or delete this chart.',
  'help.tip.db.chartMenu.example': 'Show the numbers behind a chart.',
  'help.tip.db.groupedBy.meaning':
    'Chooses which column makes the board’s columns.',
  'help.tip.db.groupedBy.example':
    'Group a board by a Choice column such as “Status”.',
  'help.tip.db.cardShows.meaning': 'Chooses which values appear on each card.',
  'help.tip.db.cardShows.example': 'Show a rating on every card.',
  'help.line.review.ratings':
    'Again = you forgot it · Hard = you barely remembered · Good = you remembered · Easy = no effort at all.',
  'help.line.review.practice':
    'Practising doesn’t change when cards come back. New cards beyond today’s limit stay new.',
  'help.line.db.table':
    'Click a cell to edit it. Click a column header to sort, filter or hide that column.',
  'help.tip.review.openNote.meaning':
    'Opens the note this card comes from, scrolled to the card.',
  'help.tip.review.openNote.example':
    'Check the full lesson when you are unsure of an answer.',
  'help.tip.review.suspend.meaning':
    'Hides this card from reviews until you un-suspend it. The card is not deleted.',
  'help.tip.review.suspend.example': 'Pause a card you are tired of seeing.',
  'help.tip.cards.sort.meaning':
    'Chooses the order of the cards: due first, most failed, or recently changed.',
  'help.tip.cards.sort.example':
    'Sort by “Most failed” to find your weak spots.',
  'help.tip.cards.review.meaning':
    'Reviews the due cards of this notebook. With nothing due it offers Practice anyway.',
  'help.tip.cards.review.example':
    '“Review 12 due” starts a session of 12 cards.',
  'help.tip.sidebar.dailyTemplate.meaning':
    'The layout of every new journal day. Edit it to change what your daily pages start with.',
  'help.tip.sidebar.dailyTemplate.example':
    'Add a “What did I learn?” heading to every future day.',
  'help.tip.sidebar.tag.meaning':
    'Shows everything with this tag: pages, cards and notes.',
  'help.tip.sidebar.tag.example':
    'Click “cardiology” to see all of it in one list.',
  'help.tip.page.tagChip.meaning':
    'Opens the options of this tag on the page: open it in Search or take it off this page.',
  'help.tip.page.tagChip.example': 'Remove “draft” once the page is finished.',
  'help.tip.sidebar.allCards.meaning':
    'Every card from every notebook in one list, with when it is due.',
  'help.tip.sidebar.allCards.example':
    'Find a card, or review everything that is due.',
  'help.tip.sidebar.allDatabases.meaning':
    'All your databases in one place: Study trackers and your own lists.',
  'help.tip.sidebar.allDatabases.example':
    'Open your “Drug list” or make a new one.',
  'help.tip.databases.new.meaning':
    'Makes a new database from a ready-made list (drugs, words, books, habits) or from nothing.',
  'help.tip.databases.new.example':
    'Pick “Drug list” to start with Class and Dose columns.',
  'help.tip.db.blockViews.meaning':
    'Shows this database in the note as a table, charts or a board. Only this note’s copy changes.',
  'help.tip.db.blockViews.example':
    'Sort the table here without changing the full database.',
  'help.tip.db.blockOpen.meaning':
    'Opens the whole database on its own screen.',
  'help.tip.db.blockOpen.example': 'Add columns or charts there.',
  'help.tip.db.viewCalendar.meaning':
    'Shows the rows on a calendar, on the day of a Date column.',
  'help.tip.db.viewCalendar.example':
    'See which day each exam or deadline falls on.',
  'help.tip.db.viewGallery.meaning':
    'Shows the rows as tiles, with a picture if you pick a link column.',
  'help.tip.db.viewGallery.example': 'Browse books by their cover.',
  'help.tip.db.addView.meaning':
    'Adds another view of the same rows: Table, Dashboard, Board, Calendar or Gallery.',
  'help.tip.db.addView.example': 'A second Board grouped by another column.',
  'help.tip.db.calendarNav.meaning':
    'Moves the calendar to the previous or next month or week, or back to today.',
  'help.tip.db.calendarNav.example': 'Check next week’s deadlines.',
  'help.tip.db.galleryOptions.meaning':
    'Chooses the picture column and which values show on each tile.',
  'help.tip.db.galleryOptions.example':
    'Show Author and Rating under each cover.',
  'help.tip.revise.practice.meaning':
    'Reviews this lesson’s cards (its sub-pages’ too) that are due, or practises them.',
  'help.tip.revise.practice.example':
    'Run through “Heart sounds” right before the exam.',
  'help.tip.notebook.tabRevise.meaning':
    'One revision sheet per lesson: your summary plus everything you marked in its notes.',
  'help.tip.notebook.tabRevise.example':
    'Read all Key points of a lesson before an exam.',
  'help.line.revise.how':
    'In a note, select words and press Key point, Keyword, Must know or Formula in the toolbar. Marked words collect here, per lesson.',
  'help.tip.sidebar.data.meaning':
    'Save your notes to a file, bring a file back, or share one notebook.',
  'help.tip.sidebar.data.example':
    'Keep a copy of “Cardiology” on a USB stick.',
  'help.tip.data.export.meaning':
    'Saves the whole notebook (notes, cards with their schedules, databases) as one file.',
  'help.tip.data.export.example':
    'Send “Cardiology” to a friend or keep it safe.',
  'help.tip.data.exportAll.meaning':
    'Saves everything (notes, pictures, history, Trash, settings) as one zip file. You can lock it with a password.',
  'help.tip.data.exportAll.example': 'Once a week, keep a copy on a USB stick.',
  'help.tip.data.ankiImport.meaning':
    'Adds the cards of an Anki deck (.apkg) as a new notebook. They start as new cards.',
  'help.tip.data.ankiImport.example':
    'Bring your existing biology deck over from Anki.',
  'help.tip.data.ankiExport.meaning':
    'Saves the cards and blanks of a notebook as an Anki deck (.apkg).',
  'help.tip.data.ankiExport.example':
    'Study “Cardiology” on your phone in Anki.',
  'help.tip.data.import.meaning':
    'Opens a saved file. Replace your notes with it (you can undo), or add its notebooks as copies.',
  'help.tip.data.import.example': 'Open the backup file you saved last week.',
  'help.tip.data.restore.meaning':
    'Brings back the notebooks of the backup the app saved before the last upgrade, as new copies.',
  'help.tip.data.restore.example':
    'Get a notebook back if an upgrade went wrong.',
  'help.tip.data.sample.meaning':
    'Adds a ready-made notebook with marked notes, cards and a database, so you can try every feature.',
  'help.tip.data.sample.example': 'Open its Revise tab to see marked words.',
  'help.tip.data.sampleRemove.meaning':
    'Moves the sample notebook (and only what the sample added) to the Trash, after asking you.',
  'help.tip.data.sampleRemove.example': 'Clean up after trying the app.',
  'help.tip.notebook.databasePicker.meaning':
    'Switches between the notebook’s Study tracker and its other databases.',
  'help.tip.notebook.databasePicker.example':
    'Open the “Reading list” kept in this notebook.',
  'help.line.tracker.statusRule':
    'Auto: Not started = no cards answered yet · Learning = under 75% correct · Mastered = 90% or more correct, nothing due, no new cards, and at least 80% of the cards at level Mastered · Review = in between.',
  'help.tip.db.blockWide.meaning':
    'Stretches this database to the full width of the page, so more columns fit. Click again to go back.',
  'help.tip.db.blockWide.example': 'Use it for a table with many columns.',
  'help.tip.data.exportNotes.meaning':
    'Saves notes, cards, history and settings, but not the pictures themselves. Small and quick.',
  'help.tip.data.exportNotes.example': 'Send a light copy to your own email.',
  'help.tip.data.undoRestore.meaning':
    'Puts your notes back exactly as they were before the last restore.',
  'help.tip.data.undoRestore.example': 'You opened the wrong file? Undo it.',
  'help.tip.bar.newLine.meaning':
    'Tap to add an empty line, as often as you like. Hold for a heading, checklist or divider.',
  'help.tip.bar.newLine.example':
    'Finished a sentence? Tap it for the next one.',
  'help.tip.bar.menu.meaning':
    'Edit bar, All tools (the ribbon), search, Done, copy and paste, and every formatting action.',
  'help.tip.bar.menu.example':
    'Copy as Markdown, Paste as plain text, Strikethrough.',
  'help.tip.sidebar.calendar.meaning':
    'Every dated row of your databases and every journal day, by month or week.',
  'help.tip.sidebar.calendar.example':
    'See what is due this week next to your journal.',
  'help.tip.sidebar.favourites.meaning':
    'Pages you starred, always one tap away.',
  'help.tip.sidebar.favourites.example': 'Star the page you open every day.',
  'help.tip.sidebar.recent.meaning':
    'The last pages you opened on this device.',
  'help.tip.sidebar.recent.example': 'Jump back to what you were reading.',
  'help.tip.ribbon.behaviour.meaning':
    'Choose whether the tools close after you use one, or stay open.',
  'help.tip.ribbon.behaviour.example':
    'Keep them open while you format a whole page. Ctrl+F1 switches.',
  'help.tip.bar.handle.meaning':
    'Drag this handle to move the floating bar anywhere.',
  'help.tip.bar.handle.example':
    'It snaps to the edges. Double-tap it to reset the place.',
  'help.tip.ribbon.options.meaning':
    'Choose how the ribbon shows: with or instead of the short bar, size, position.',
  'help.tip.ribbon.options.example': 'Pick Slim for one row of icons.',
  'help.tip.theme.list.meaning':
    'Opens the list of themes with a preview of each.',
  'help.tip.theme.list.example':
    'The Theme button next to it still cycles in one tap.',
  'help.tip.tool.copyPaste.meaning':
    'Extra ways to copy and paste: plain text, Markdown, page with pictures.',
  'help.tip.tool.copyPaste.example':
    'Normal copy and paste stay on the keyboard and long-press.',
  'help.tip.topBar.deviceMode.meaning':
    'Shows how you use this device: Computer, Touch or Pencil. Tap to change.',
  'help.tip.topBar.deviceMode.example':
    'On an iPad with a Pencil, choose Pencil for bigger buttons.',
  'help.tip.path.sep.meaning':
    'Lists the other pages at this level so you can jump to one.',
  'help.tip.path.sep.example':
    'Tap the arrow after a notebook to see its top pages.',
  'help.tip.ink.layers.meaning':
    'Layers are clear sheets of ink over the page. Hide, lock or reorder them.',
  'help.tip.ink.layers.example':
    'Keep your corrections on their own layer and hide them to see the clean page.',
  'help.tip.ink.finger.meaning':
    'Chooses whether a finger draws or only scrolls and zooms.',
  'help.tip.ink.finger.example':
    'With an Apple Pencil, leave it on Automatic so a resting hand never draws.',
  'help.tip.sidebar.spaces.meaning':
    'The four spaces: Home, Library, Notebooks and Review. Each shows its own list.',
  'help.tip.sidebar.spaces.example':
    'Tap Review to see your cards and saved searches.',
  'help.tip.sidebar.corner.meaning':
    'The quiet corner: Settings, Save & restore, Trash, Device mode, Help and the theme.',
  'help.tip.sidebar.corner.example': 'Switch to Night here in the evening.',
  'help.line.lock.privacy':
    'A privacy lock hides the page behind this screen. It is not encryption: it keeps casual eyes out, not experts.',
  'help.line.reading.aloud':
    'Uses your device voice, free and offline where the voice allows. Words are marked as they are spoken.',
  'help.tip.bar.tools.meaning':
    'Tap a tool to use it and see its options. Hold it and slide onto an option.',
  'help.tip.bar.tools.example': 'Hold Pen, slide to a colour, let go.',
  'help.tip.pill.grip.meaning':
    'Drag to move the options; they snap to the nearest edge.',
  'help.tip.pill.grip.example':
    'Drag them to the right edge for a vertical strip.',
  'help.tip.pill.pin.meaning': 'Keeps these options open until you close them.',
  'help.tip.pill.pin.example': 'Pin the Text options while you format a page.',
  'help.tip.notebook.viewMenu.meaning':
    'Choose how this notebook shows its pages: the usual way, a shelf of covers, or coloured section tabs.',
  'help.tip.notebook.viewMenu.example':
    'Pick Shelf to see your pages like a row of notebooks.',
  'help.tip.notebook.layoutMenu.meaning':
    'Choose how this tab lists the pages: list, gallery, table or board. It is remembered.',
  'help.tip.notebook.layoutMenu.example':
    'Pick Gallery to see a preview of each page.',
  'help.tip.sidebar.allSummaries.meaning':
    'Every key point you added from your notes, from all notebooks, in one list.',
  'help.tip.sidebar.allSummaries.example':
    'Skim all your summaries the evening before a test.',
  'help.tip.summary.remove.meaning':
    'Takes this line out of the Summary. The note itself stays.',
  'help.tip.summary.remove.example':
    'Drop a point you no longer need to revise.',
  'help.tip.summary.goto.meaning':
    'Opens the note this line comes from and shows it.',
  'help.tip.summary.goto.example': 'Check the full explanation behind a point.',
  'help.tip.notebook.tabSummary.meaning':
    'The key points you added from every page of this notebook, in one list.',
  'help.tip.notebook.tabSummary.example':
    'Read the whole notebook’s key points the night before an exam.',
  'help.tip.calendar.nav.meaning':
    'Moves the calendar back or forward by a day, a week or a month, or jumps to today.',
  'help.tip.calendar.nav.example':
    'In Day, this also works by swiping the card sideways.',
  'help.tip.newPage.always.meaning':
    'Every new page will open with the Study notes template filled in. You can turn it off again in Settings › General.',
  'help.tip.newPage.always.example':
    'Handy when almost every page you make is lesson notes.',
  'help.tip.math.palette.meaning':
    'Tap a button to write that piece of maths for you. If you selected some text first, it goes inside the new piece.',
  'help.tip.math.palette.example':
    'Tap the fraction button, then type the top and bottom.',
  'help.line.math.latex':
    'LaTeX is a way to write maths as text. You can type it yourself, or use the buttons below and let them write it.',
  'help.tip.home.tick.meaning': 'Marks this item done, or open again.',
  'help.tip.home.tick.example': 'Tick “Call the bank” when it is finished.',
  'help.tip.home.planPrev.meaning': 'Shows the day before.',
  'help.tip.home.planPrev.example': 'Look at what you planned yesterday.',
  'help.tip.home.planNext.meaning': 'Shows the next day.',
  'help.tip.home.planNext.example': 'Plan tomorrow’s tasks ahead.',
  'help.tip.home.affirmPlay.meaning':
    'Reads this affirmation aloud, or stops it.',
  'help.tip.home.affirmPlay.example':
    'Play your morning lines while you dress.',
  'help.tip.home.remove.meaning':
    'Removes this from the list. Undo is offered.',
  'help.tip.home.remove.example': 'Take a finished habit off your routine.',
  'help.tip.home.taskMenu.meaning': 'Opens more actions for this task.',
  'help.tip.home.taskMenu.example': 'Move it to a project or set a day.',
  'help.tip.home.timerStop.meaning': 'Stops the timer and saves the time.',
  'help.tip.home.timerStop.example': 'Stop when your study block ends.',
  'help.tip.annot.colourFilter.meaning':
    'Shows only highlights of this colour.',
  'help.tip.annot.colourFilter.example': 'Tap yellow to see only key ideas.',
  'help.tip.annot.highlightColour.meaning':
    'Highlights the selected text in this colour.',
  'help.tip.annot.highlightColour.example':
    'Use green for facts you must remember.',
  'help.tip.reader.close.meaning': 'Closes the book and goes back to its page.',
  'help.tip.reader.close.example': 'Return to your notes on the book.',
  'help.tip.reader.zoomOut.meaning': 'Makes the pages smaller.',
  'help.tip.reader.zoomOut.example': 'See a whole page at once.',
  'help.tip.reader.fitWidth.meaning': 'Resets the zoom to fit the page width.',
  'help.tip.reader.fitWidth.example': 'Tap after zooming in too far.',
  'help.tip.reader.zoomIn.meaning': 'Makes the pages larger.',
  'help.tip.reader.zoomIn.example': 'Read small print in a scanned book.',
  'help.tip.reader.prev.meaning': 'Goes to the previous page.',
  'help.tip.reader.prev.example': 'Go back to the line you just read.',
  'help.tip.reader.next.meaning': 'Goes to the next page.',
  'help.tip.reader.next.example': 'Turn the page when you finish reading it.',
  'help.tip.reader.smaller.meaning': 'Makes the book text smaller.',
  'help.tip.reader.smaller.example': 'Fit more words on a small screen.',
  'help.tip.reader.larger.meaning': 'Makes the book text larger.',
  'help.tip.reader.larger.example': 'Read comfortably from a distance.',
  'help.tip.reader.bookmark.meaning':
    'Saves this place, or removes the saved place.',
  'help.tip.reader.bookmark.example': 'Mark where you stopped for tonight.',
  'help.tip.pic.zoomOut.meaning': 'Zooms the picture out.',
  'help.tip.pic.zoomOut.example': 'See the whole picture while you crop.',
  'help.tip.pic.zoomIn.meaning': 'Zooms the picture in.',
  'help.tip.pic.zoomIn.example': 'Place the crop edge exactly.',
  'help.tip.audio.panelClose.meaning':
    'Closes the audio panel. Recording keeps going.',
  'help.tip.audio.panelClose.example':
    'Hide the panel while a lecture records.',
  'help.tip.library.cardMenu.meaning':
    'Opens more actions for this book or source.',
  'help.tip.library.cardMenu.example': 'Open its notes page or delete it.',
}
