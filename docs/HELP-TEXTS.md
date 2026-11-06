# Help texts to review

Every hover tip and help line in the app (shown while Settings › Show help is On). Generated from `src/help/helpRegistry.ts` and `src/i18n/en.ts`; to change a text, edit it in `en.ts`, then run `UPDATE_HELP=1 npx vitest run src/help` to refresh this file.

## Hover tips (130)

### `bar.newLine`

- **Where:** Page › main bar › ↵ New line
- **Meaning:** Tap to add an empty line, as often as you like. Hold for a heading, checklist or divider.
- **Example:** Finished a sentence? Tap it for the next one.

### `bar.menu`

- **Where:** Page › main bar › ⋯ menu
- **Meaning:** Edit bar, All tools (the ribbon), search, Done, copy and paste, and every formatting action.
- **Example:** Copy as Markdown, Paste as plain text, Strikethrough.

### `bar.tools`

- **Where:** Page › main bar › the tools (Text, Pen, Highlighter …)
- **Meaning:** Tap a tool to use it and see its options. Hold it and slide onto an option.
- **Example:** Hold Pen, slide to a colour, let go.

### `pill.grip`

- **Where:** Page › options pill › ⠿ grip at its start
- **Meaning:** Drag to move the options; they snap to the nearest edge.
- **Example:** Drag them to the right edge for a vertical strip.

### `pill.pin`

- **Where:** Page › options pill › 📌 pin
- **Meaning:** Keeps these options open until you close them.
- **Example:** Pin the Text options while you format a page.

### `ink.layers`

- **Where:** Page › Pen, Highlighter or Lasso card › Layers
- **Meaning:** Layers are clear sheets of ink over the page. Hide, lock or reorder them.
- **Example:** Keep your corrections on their own layer and hide them to see the clean page.

### `ink.finger`

- **Where:** Page › Pen card › Pen settings › Finger can draw
- **Meaning:** Chooses whether a finger draws or only scrolls and zooms.
- **Example:** With an Apple Pencil, leave it on Automatic so a resting hand never draws.

### `ribbon.behaviour`

- **Where:** Page › ribbon › Tools close after use / stay open
- **Meaning:** Choose whether the tools close after you use one, or stay open.
- **Example:** Keep them open while you format a whole page. Ctrl+F1 switches.

### `bar.handle`

- **Where:** Page › floating bar › ⠿ handle
- **Meaning:** Drag this handle to move the floating bar anywhere.
- **Example:** It snaps to the edges. Double-tap it to reset the place.

### `ribbon.options`

- **Where:** Page › ribbon › ⋯ Ribbon options
- **Meaning:** Choose how the ribbon shows: with or instead of the short bar, size, position.
- **Example:** Pick Slim for one row of icons.

### `theme.list`

- **Where:** Page › ribbon View › Theme › arrow; short bar Read set
- **Meaning:** Opens the list of themes with a preview of each.
- **Example:** The Theme button next to it still cycles in one tap.

### `tool.copyPaste`

- **Where:** Page › ribbon Home › Copy & paste
- **Meaning:** Extra ways to copy and paste: plain text, Markdown, page with pictures.
- **Example:** Normal copy and paste stay on the keyboard and long-press.

### `path.sep`

- **Where:** Top bar › full page path › the arrow between parts
- **Meaning:** Lists the other pages at this level so you can jump to one.
- **Example:** Tap the arrow after a notebook to see its top pages.

### `topBar.deviceMode`

- **Where:** Top bar › Device mode button (right side)
- **Meaning:** Shows how you use this device: Computer, Touch or Pencil. Tap to change.
- **Example:** On an iPad with a Pencil, choose Pencil for bigger buttons.

### `sidebar.calendar`

- **Where:** Sidebar › Calendar
- **Meaning:** Every dated row of your databases and every journal day, by month or week.
- **Example:** See what is due this week next to your journal.

### `sidebar.favourites`

- **Where:** Sidebar › Favourites heading
- **Meaning:** Pages you starred, always one tap away.
- **Example:** Star the page you open every day.

### `sidebar.recent`

- **Where:** Sidebar › Recent heading
- **Meaning:** The last pages you opened on this device.
- **Example:** Jump back to what you were reading.

### `tracker.lesson`

- **Where:** Study tracker › Lesson column header
- **Meaning:** Each row is one lesson: a top-level page of this notebook. Its sub-pages count towards it.
- **Example:** Cards on the sub-page “Heart › Valves” count for the lesson “Heart”.

### `tracker.status`

- **Where:** Study tracker › Status column header
- **Meaning:** Where this lesson stands. The app works it out from your card answers, or you can set it yourself.
- **Example:** Not started, Learning, Review or Mastered.

### `tracker.status.notStarted`

- **Where:** Study tracker › the “Not started” pill, board column and menu item
- **Meaning:** You haven’t answered any card of this lesson yet.
- **Example:** A lesson whose cards are all new.

### `tracker.status.learning`

- **Where:** Study tracker › the “Learning” pill, board column and menu item
- **Meaning:** Fewer than 75% of the cards you answered were right.
- **Example:** 6 of 10 answered cards right → 60% → Learning.

### `tracker.status.review`

- **Where:** Study tracker › the “Review” pill, board column and menu item
- **Meaning:** Mostly right, but not finished: some cards are due, new or still short of Mastered.
- **Example:** 85% right, or 95% right with 2 cards due → Review.

### `tracker.status.mastered`

- **Where:** Study tracker › the “Mastered” pill, board column and menu item
- **Meaning:** 90% or more right, nothing due, no new cards, and at least 80% of the cards at level Mastered.
- **Example:** 10 cards, all right, 8 or more back only every 21+ days.

### `tracker.pin`

- **Where:** Study tracker › the 📌 next to a status you set
- **Meaning:** You set this status yourself, so the app leaves it alone. Choose Auto in the menu to hand it back.
- **Example:** Menu › Auto (now: Review).

### `tracker.lastRevised`

- **Where:** Study tracker › Last revised column header
- **Meaning:** The last time you answered any card of this lesson (a review or Practice anyway).
- **Example:** You reviewed one of its cards yesterday → yesterday’s date.

### `tracker.cardsDue`

- **Where:** Study tracker › Cards due column header
- **Meaning:** Cards ready to review now, and new cards you haven’t started.
- **Example:** 5 due · 20 new.

### `tracker.correct`

- **Where:** Study tracker › % correct column header
- **Meaning:** Of the cards you’ve answered, how many your latest answer got right (anything but Again).
- **Example:** 8 of 10 answered cards right → 80%.

### `tracker.levels`

- **Where:** Study tracker › Card levels column header
- **Meaning:** How well you know this lesson’s cards, by how far apart their reviews are.
- **Example:** 3 New · 2 Learning · 4 Familiar · 1 Mastered.

### `tracker.level.new`

- **Where:** Study tracker › Card levels bar and numbers, “New”
- **Meaning:** You haven’t studied this card yet.
- **Example:** A card you just made.

### `tracker.level.learning`

- **Where:** Study tracker › Card levels bar and numbers, “Learning”
- **Meaning:** You’re still getting it, so it comes back again soon.
- **Example:** Its next review is less than a day away.

### `tracker.level.familiar`

- **Where:** Study tracker › Card levels bar and numbers, “Familiar”
- **Meaning:** You mostly know it, and the reviews are getting further apart.
- **Example:** Its next review is 1 to 20 days away.

### `tracker.level.mastered`

- **Where:** Study tracker › Card levels bar and numbers, “Mastered”
- **Meaning:** You know it well, so you’ll only see it every few weeks.
- **Example:** Its next review is 21 days or more away.

### `tracker.confidence`

- **Where:** Study tracker › Confidence column header
- **Meaning:** Your own feeling about this lesson, from 1 to 5 stars. The app never changes it.
- **Example:** ★★★☆☆ = fairly sure.

### `tracker.newLesson`

- **Where:** Study tracker › “+ New lesson” (table and board)
- **Meaning:** Adds a lesson: a new page at the top of this notebook.
- **Example:** Add “Kidney”, then write its notes and cards in it.

### `tracker.chart.streak`

- **Where:** Study tracker › Dashboard › Study streak chart title
- **Meaning:** How many days in a row you answered at least one card. A day that isn’t over yet doesn’t break it.
- **Example:** 🔥 5 days = you studied every day since Friday.

### `tracker.chart.correct`

- **Where:** Study tracker › Dashboard › % correct per week chart title
- **Meaning:** Of all your answers each week, how many were not Again. Every answer counts, even for the same card.
- **Example:** A week with 40 answers, 30 of them right → 75%.

### `tracker.chart.days`

- **Where:** Study tracker › Dashboard › Cards answered per day chart title
- **Meaning:** Each square is a day. The darker it is, the more cards you answered.
- **Example:** A dark square = a busy study day; a blank one = a day off.

### `sidebar.today`

- **Where:** Sidebar › Today button
- **Meaning:** Opens today’s journal page. Every day gets its own page, made from the Daily journal template.
- **Example:** Write what you learned today; tomorrow you get a fresh page.

### `sidebar.search`

- **Where:** Sidebar › Search
- **Meaning:** Finds words in all your notes, cards and tags.
- **Example:** Type “mitral” to see every note and card that mentions it.

### `sidebar.review`

- **Where:** Sidebar › Review (the number is how many cards are due)
- **Meaning:** Starts reviewing the cards that are due today. The badge shows how many are waiting.
- **Example:** A badge “12” means 12 cards are ready now.

### `sidebar.newNotebook`

- **Where:** Sidebar › Notebooks › +
- **Meaning:** Creates a notebook: one place for all the pages of a subject.
- **Example:** Make a notebook called “Cardiology”.

### `sidebar.notebook`

- **Where:** Sidebar › a notebook’s name
- **Meaning:** Opens the notebook (Notes, Database and Cards tabs). Double-click the name to rename it.
- **Example:** Click “Cardiology” to see its lessons in a table.

### `sidebar.addPage`

- **Where:** Sidebar › a notebook’s + (on hover)
- **Meaning:** Adds a page to this notebook: blank, or from a template.
- **Example:** A new page called “Heart sounds”.

### `sidebar.reviewNotebook`

- **Where:** Sidebar › a notebook’s ⟳ (on hover)
- **Meaning:** Reviews only the cards of this notebook that are due.
- **Example:** Revise Cardiology without seeing Chemistry cards.

### `sidebar.rename`

- **Where:** Sidebar › a notebook’s ✎ (on hover)
- **Meaning:** Changes this notebook’s name.
- **Example:** “Cardio” → “Cardiology”.

### `sidebar.deleteNotebook`

- **Where:** Sidebar › a notebook’s × (on hover)
- **Meaning:** Moves the notebook and all its pages to the Trash. You can restore it from there.
- **Example:** Deleted by mistake? Open Trash and press ↺.

### `sidebar.addSubPage`

- **Where:** Sidebar › a page’s + (on hover)
- **Meaning:** Adds a page inside this page, to split a big topic into parts.
- **Example:** “Valves” inside “Heart sounds”.

### `sidebar.moveUp`

- **Where:** Sidebar › a page’s ↑ (on hover)
- **Meaning:** Moves this page one place up among its neighbours.
- **Example:** “Valves” goes above “Murmurs”.

### `sidebar.moveDown`

- **Where:** Sidebar › a page’s ↓ (on hover)
- **Meaning:** Moves this page one place down among its neighbours.
- **Example:** “Murmurs” goes below “Valves”.

### `sidebar.moveTop`

- **Where:** Sidebar › a sub-page’s ↰ (on hover)
- **Meaning:** Takes this sub-page out of its parent and makes it a page on its own.
- **Example:** The sub-page “Valves” becomes its own lesson.

### `sidebar.deletePage`

- **Where:** Sidebar › a page’s × (on hover)
- **Meaning:** Moves this page and its sub-pages to the Trash. You can restore them.
- **Example:** Restore it later from Trash.

### `sidebar.newTemplate`

- **Where:** Sidebar › Templates › +
- **Meaning:** Creates a template: a page layout you can reuse for new pages.
- **Example:** A “Study notes” layout with Summary and Questions.

### `sidebar.deleteTemplate`

- **Where:** Sidebar › a template’s × (on hover)
- **Meaning:** Deletes this template. Pages already made from it stay as they are.
- **Example:** Remove a layout you no longer use.

### `sidebar.restore`

- **Where:** Sidebar › Trash › ↺ (on hover)
- **Meaning:** Brings this item back from the Trash, with its pages and cards.
- **Example:** Restore the page “Heart sounds”.

### `sidebar.deleteForever`

- **Where:** Sidebar › Trash › × (on hover)
- **Meaning:** Erases this item for good, with its cards and review history. This cannot be undone.
- **Example:** Clear out things you will never need again.

### `sidebar.newTag`

- **Where:** Sidebar › Tags › +
- **Meaning:** Creates a tag: a label you can put on pages and cards to find them together.
- **Example:** Type “medicine/cardiology” to make a tag inside a tag.

### `sidebar.tagOptions`

- **Where:** Sidebar › a tag’s ⋯ (on hover)
- **Meaning:** Rename, move, merge, recolour or delete this tag.
- **Example:** Merge “cardio” into “cardiology”.

### `sidebar.savedReview`

- **Where:** Sidebar › Saved searches › ⟳ (on hover)
- **Meaning:** Reviews the due cards found by this saved search.
- **Example:** A saved search for “Most failed cards” becomes a study deck.

### `sidebar.savedRename`

- **Where:** Sidebar › Saved searches › ✎ (on hover)
- **Meaning:** Changes the name of this saved search.
- **Example:** “Wrong cards” → “Hard ones”.

### `sidebar.savedDelete`

- **Where:** Sidebar › Saved searches › × (on hover)
- **Meaning:** Deletes this saved search. Your notes and cards are not touched.
- **Example:** Remove a search you no longer use.

### `sidebar.settings`

- **Where:** Quiet corner › Settings
- **Meaning:** Opens Settings: theme, when your day starts, review limits and more.
- **Example:** Turn “Show help” off once you know the app.

### `sidebar.spaces`

- **Where:** The strip of spaces (left edge, bottom on a phone)
- **Meaning:** The four spaces: Home, Library, Notebooks and Review. Each shows its own list.
- **Example:** Tap Review to see your cards and saved searches.

### `sidebar.corner`

- **Where:** Strip › ⚙ quiet corner
- **Meaning:** The quiet corner: Settings, Save & restore, Trash, Device mode, Help and the theme.
- **Example:** Switch to Night here in the evening.

### `sidebar.theme`

- **Where:** Quiet corner › Day / Night / Sepia buttons
- **Meaning:** Changes how the app looks: light, dark, or warm paper.
- **Example:** Night is easier on the eyes in the evening.

### `notebook.tabNotes`

- **Where:** Notebook › Notes tab
- **Meaning:** The pages of this notebook, as a list you can open.
- **Example:** Open “Heart sounds” to read or edit it.

### `notebook.tabDatabase`

- **Where:** Notebook › Database tab
- **Meaning:** Your Study tracker: one row per lesson, with its status and progress. You can add your own columns.
- **Example:** See which lessons still need work.

### `notebook.tabCards`

- **Where:** Notebook › Cards tab
- **Meaning:** Every card of this notebook in one list, with when it is due.
- **Example:** Find a card quickly, or review them all.

### `notebook.tabOptions`

- **Where:** Notebook › ⋯ beside the tabs
- **Meaning:** Rename or hide the tabs of this notebook.
- **Example:** Hide the Cards tab if you never use it.

### `notebook.viewMenu`

- **Where:** Notebook › Notes tab › View
- **Meaning:** Choose how this notebook shows its pages: the usual way, a shelf of covers, or coloured section tabs.
- **Example:** Pick Shelf to see your pages like a row of notebooks.

### `notebook.layoutMenu`

- **Where:** Notebook › Notes tab › Layout
- **Meaning:** Choose how this tab lists the pages: list, gallery, table or board. It is remembered.
- **Example:** Pick Gallery to see a preview of each page.

### `notebook.close`

- **Where:** Notebook › × (top right)
- **Meaning:** Closes the notebook and goes back to your last page.
- **Example:** Back to where you were writing.

### `page.reviewPage`

- **Where:** Page › ⋯ › Review this page
- **Meaning:** Reviews the cards of this page that are due, and its sub-pages’ cards.
- **Example:** Revise one lesson right after reading it.

### `page.saveTemplate`

- **Where:** Page › ⋯ › Save as template
- **Meaning:** Saves this page’s layout as a template for new pages (its sub-pages too).
- **Example:** Turn a good lesson page into a reusable layout.

### `page.history`

- **Where:** Page › ⋯ › History
- **Meaning:** Shows earlier copies of this page. You can look at one and bring it back.
- **Example:** Undo a paragraph you deleted by mistake last week.

### `page.import`

- **Where:** Page › ⋯ › Import (coming soon)
- **Meaning:** Will bring a file into this page. It arrives in a later phase.
- **Example:** Import notes from another app.

### `page.export`

- **Where:** Page › ⋯ › Export
- **Meaning:** Saves or shares this page as a PDF, Word, Markdown or text file.
- **Example:** Export a lesson as a document.

### `page.addTag`

- **Where:** Page › + Add tag (under the title)
- **Meaning:** Puts a tag on this page so you can find it with others.
- **Example:** Tag “Heart sounds” with “cardiology”.

### `page.sections`

- **Where:** Page › the chips at the top of a long page
- **Meaning:** Jumps to a heading on this page.
- **Example:** Click “Murmurs” to scroll straight to it.

### `review.show`

- **Where:** Review › Show answer
- **Meaning:** Reveals the answer. Try to remember it first, then check.
- **Example:** Press Space to reveal.

### `review.ratings`

- **Where:** Review › Again / Hard / Good / Easy
- **Meaning:** Tell the app how well you remembered. The time under each button is when the card comes back.
- **Example:** Forgot → Again (soon). Knew it easily → Easy (much later).

### `review.scope`

- **Where:** Review › All / Got wrong switch
- **Meaning:** Choose which cards to review: everything due, or only cards you got wrong lately.
- **Example:** Use “Got wrong” to drill the cards you keep missing.

### `review.practice`

- **Where:** Review › Practice anyway
- **Meaning:** Goes through cards that are not due yet, for extra practice. It does not change when they come back.
- **Example:** A quick run before an exam.

### `review.close`

- **Where:** Review › × (top right)
- **Meaning:** Leaves the review. Cards you answered stay answered.
- **Example:** Stop for today and come back later.

### `search.types`

- **Where:** Search › All / Notes / Cards / … chips
- **Meaning:** Shows only one kind of result.
- **Example:** Pick Cards to search only your flashcards.

### `search.save`

- **Where:** Search › Save this search
- **Meaning:** Keeps this search in the sidebar so you can open it again in one click.
- **Example:** Save “cards tagged cardiology” as a study deck.

### `search.reviewCards`

- **Where:** Search › Review these cards
- **Meaning:** Reviews the due cards among these results.
- **Example:** Search “valves”, then revise just those cards.

### `search.removeEmpty`

- **Where:** Search › Remove empty cards
- **Meaning:** Removes cards that have no question. Their answer lines stay in your notes as normal text.
- **Example:** Clean up cards you started but never wrote.

### `db.viewTable`

- **Where:** Database › Table view button
- **Meaning:** Shows the rows in a table you can edit, sort and filter.
- **Example:** Fix a value in its cell, or sort a column.

### `db.viewDashboard`

- **Where:** Database › Dashboard view button
- **Meaning:** Shows charts and numbers about your rows.
- **Example:** See how the rows split into groups, as a donut.

### `db.viewBoard`

- **Where:** Database › Board view button
- **Meaning:** Shows the rows as cards in columns. Drag a card to change its column.
- **Example:** Drag a card from “To do” to “Done”.

### `db.viewOptions`

- **Where:** Database › ⋯ beside the views
- **Meaning:** Choose which view opens first and other view settings.
- **Example:** Open on the Dashboard once there are rows.

### `db.addColumn`

- **Where:** Database › + Column
- **Meaning:** Adds your own column: text, number, date, choice, checkbox and more.
- **Example:** Add “Exam date” as a Date column.

### `db.column`

- **Where:** Database › a column header
- **Meaning:** Opens the column menu: sort, filter, hide or edit.
- **Example:** Sort a number column from high to low.

### `db.newRow`

- **Where:** Database › + New row
- **Meaning:** Adds a row (a page you can open and write in).
- **Example:** Add the drug “Amlodipine” to a Drug list.

### `db.addChart`

- **Where:** Dashboard › + Add chart
- **Meaning:** Adds a chart: a number, bars, a line, a donut, a progress bar or a calendar.
- **Example:** A bar for each row’s number.

### `db.chartMenu`

- **Where:** Dashboard › ⋯ on a chart
- **Meaning:** Edit, move, show as a table, or delete this chart.
- **Example:** Show the numbers behind a chart.

### `db.groupedBy`

- **Where:** Board › Grouped by …
- **Meaning:** Chooses which column makes the board’s columns.
- **Example:** Group a board by a Choice column such as “Status”.

### `db.cardShows`

- **Where:** Board › Card shows
- **Meaning:** Chooses which values appear on each card.
- **Example:** Show a rating on every card.

### `review.openNote`

- **Where:** Review › Open note (under the card)
- **Meaning:** Opens the note this card comes from, scrolled to the card.
- **Example:** Check the full lesson when you are unsure of an answer.

### `review.suspend`

- **Where:** Review › Suspend (under the card)
- **Meaning:** Hides this card from reviews until you un-suspend it. The card is not deleted.
- **Example:** Pause a card you are tired of seeing.

### `cards.sort`

- **Where:** Cards tab › Sort button
- **Meaning:** Chooses the order of the cards: due first, most failed, or recently changed.
- **Example:** Sort by “Most failed” to find your weak spots.

### `cards.review`

- **Where:** Cards tab › Review N due / Practice
- **Meaning:** Reviews the due cards of this notebook. With nothing due it offers Practice anyway.
- **Example:** “Review 12 due” starts a session of 12 cards.

### `sidebar.dailyTemplate`

- **Where:** Sidebar › Templates › Daily journal
- **Meaning:** The layout of every new journal day. Edit it to change what your daily pages start with.
- **Example:** Add a “What did I learn?” heading to every future day.

### `sidebar.tag`

- **Where:** Sidebar › a tag’s name
- **Meaning:** Shows everything with this tag: pages, cards and notes.
- **Example:** Click “cardiology” to see all of it in one list.

### `page.tagChip`

- **Where:** Page › a tag under the title
- **Meaning:** Opens the options of this tag on the page: open it in Search or take it off this page.
- **Example:** Remove “draft” once the page is finished.

### `sidebar.allCards`

- **Where:** Sidebar › All cards
- **Meaning:** Every card from every notebook in one list, with when it is due.
- **Example:** Find a card, or review everything that is due.

### `sidebar.allDatabases`

- **Where:** Sidebar › Databases
- **Meaning:** All your databases in one place: Study trackers and your own lists.
- **Example:** Open your “Drug list” or make a new one.

### `databases.new`

- **Where:** All databases › + New database
- **Meaning:** Makes a new database from a ready-made list (drugs, words, books, habits) or from nothing.
- **Example:** Pick “Drug list” to start with Class and Dose columns.

### `db.blockViews`

- **Where:** A database inside a note › Table / Dashboard / Board
- **Meaning:** Shows this database in the note as a table, charts or a board. Only this note’s copy changes.
- **Example:** Sort the table here without changing the full database.

### `db.blockOpen`

- **Where:** A database inside a note › Open
- **Meaning:** Opens the whole database on its own screen.
- **Example:** Add columns or charts there.

### `db.blockWide`

- **Where:** A database inside a note › Full width
- **Meaning:** Stretches this database to the full width of the page, so more columns fit. Click again to go back.
- **Example:** Use it for a table with many columns.

### `db.viewCalendar`

- **Where:** Database › Calendar view button
- **Meaning:** Shows the rows on a calendar, on the day of a Date column.
- **Example:** See which day each exam or deadline falls on.

### `db.viewGallery`

- **Where:** Database › Gallery view button
- **Meaning:** Shows the rows as tiles, with a picture if you pick a link column.
- **Example:** Browse books by their cover.

### `db.addView`

- **Where:** Database › + View
- **Meaning:** Adds another view of the same rows: Table, Dashboard, Board, Calendar or Gallery.
- **Example:** A second Board grouped by another column.

### `db.calendarNav`

- **Where:** Calendar › ‹ Today ›
- **Meaning:** Moves the calendar to the previous or next month or week, or back to today.
- **Example:** Check next week’s deadlines.

### `db.galleryOptions`

- **Where:** Gallery › Gallery options
- **Meaning:** Chooses the picture column and which values show on each tile.
- **Example:** Show Author and Rating under each cover.

### `revise.practice`

- **Where:** Revise tab › Practise this lesson
- **Meaning:** Reviews this lesson’s cards (its sub-pages’ too) that are due, or practises them.
- **Example:** Run through “Heart sounds” right before the exam.

### `notebook.tabRevise`

- **Where:** Notebook › Revise tab
- **Meaning:** One revision sheet per lesson: your summary plus everything you marked in its notes.
- **Example:** Read all Key points of a lesson before an exam.

### `sidebar.data`

- **Where:** Quiet corner › Save & restore
- **Meaning:** Save your notes to a file, bring a file back, or share one notebook.
- **Example:** Keep a copy of “Cardiology” on a USB stick.

### `data.export`

- **Where:** Save & restore › Save file
- **Meaning:** Saves the whole notebook (notes, cards with their schedules, databases) as one file.
- **Example:** Send “Cardiology” to a friend or keep it safe.

### `data.exportAll`

- **Where:** Save & restore › Save everything
- **Meaning:** Saves everything (notes, pictures, history, Trash, settings) as one zip file. You can lock it with a password.
- **Example:** Once a week, keep a copy on a USB stick.

### `data.ankiImport`

- **Where:** Save & restore › Anki › Import
- **Meaning:** Adds the cards of an Anki deck (.apkg) as a new notebook. They start as new cards.
- **Example:** Bring your existing biology deck over from Anki.

### `data.ankiExport`

- **Where:** Save & restore › Anki › Save for Anki
- **Meaning:** Saves the cards and blanks of a notebook as an Anki deck (.apkg).
- **Example:** Study “Cardiology” on your phone in Anki.

### `data.import`

- **Where:** Save & restore › Restore › Open saved file
- **Meaning:** Opens a saved file. Replace your notes with it (you can undo), or add its notebooks as copies.
- **Example:** Open the backup file you saved last week.

### `data.restore`

- **Where:** Save & restore › Bring back
- **Meaning:** Brings back the notebooks of the backup the app saved before the last upgrade, as new copies.
- **Example:** Get a notebook back if an upgrade went wrong.

### `data.exportNotes`

- **Where:** Save & restore › Save notes only
- **Meaning:** Saves notes, cards, history and settings, but not the pictures themselves. Small and quick.
- **Example:** Send a light copy to your own email.

### `data.undoRestore`

- **Where:** Save & restore › Undo restore
- **Meaning:** Puts your notes back exactly as they were before the last restore.
- **Example:** You opened the wrong file? Undo it.

### `data.sample`

- **Where:** Save & restore › Load sample notebook
- **Meaning:** Adds a ready-made notebook with marked notes, cards and a database, so you can try every feature.
- **Example:** Open its Revise tab to see marked words.

### `data.sampleRemove`

- **Where:** Save & restore › Remove sample notebook
- **Meaning:** Moves the sample notebook (and only what the sample added) to the Trash, after asking you.
- **Example:** Clean up after trying the app.

### `notebook.databasePicker`

- **Where:** Notebook › Database tab › database buttons
- **Meaning:** Switches between the notebook’s Study tracker and its other databases.
- **Example:** Open the “Reading list” kept in this notebook.

### `home.tick`

- **Where:** Home › task, habit and Top 3 rows › the round tick box
- **Meaning:** Marks this item done, or open again.
- **Example:** Tick “Call the bank” when it is finished.

### `home.planPrev`

- **Where:** Home › Plan tab › ‹ previous day
- **Meaning:** Shows the day before.
- **Example:** Look at what you planned yesterday.

### `home.planNext`

- **Where:** Home › Plan tab › › next day
- **Meaning:** Shows the next day.
- **Example:** Plan tomorrow’s tasks ahead.

### `home.affirmPlay`

- **Where:** Home › Routines › ▶ play an affirmation
- **Meaning:** Reads this affirmation aloud, or stops it.
- **Example:** Play your morning lines while you dress.

### `home.remove`

- **Where:** Home › Top 3, projects and habits › × remove
- **Meaning:** Removes this from the list. Undo is offered.
- **Example:** Take a finished habit off your routine.

### `home.taskMenu`

- **Where:** Home › task row › ⋯ menu
- **Meaning:** Opens more actions for this task.
- **Example:** Move it to a project or set a day.

### `home.timerStop`

- **Where:** Home › timer chip › ⏹ stop
- **Meaning:** Stops the timer and saves the time.
- **Example:** Stop when your study block ends.

### `annot.colourFilter`

- **Where:** Reader › Highlights panel › colour dots
- **Meaning:** Shows only highlights of this colour.
- **Example:** Tap yellow to see only key ideas.

### `annot.highlightColour`

- **Where:** Reader › selection pop-up › colour dots
- **Meaning:** Highlights the selected text in this colour.
- **Example:** Use green for facts you must remember.

### `reader.close`

- **Where:** Book reader › top bar › ✕ close
- **Meaning:** Closes the book and goes back to its page.
- **Example:** Return to your notes on the book.

### `reader.zoomOut`

- **Where:** Book reader (PDF) › top bar › −
- **Meaning:** Makes the pages smaller.
- **Example:** See a whole page at once.

### `reader.fitWidth`

- **Where:** Book reader (PDF) › top bar › zoom percent
- **Meaning:** Resets the zoom to fit the page width.
- **Example:** Tap after zooming in too far.

### `reader.zoomIn`

- **Where:** Book reader (PDF) › top bar › +
- **Meaning:** Makes the pages larger.
- **Example:** Read small print in a scanned book.

### `reader.prev`

- **Where:** Book reader (EPUB) › top bar › ‹
- **Meaning:** Goes to the previous page.
- **Example:** Go back to the line you just read.

### `reader.next`

- **Where:** Book reader (EPUB) › top bar › ›
- **Meaning:** Goes to the next page.
- **Example:** Turn the page when you finish reading it.

### `reader.smaller`

- **Where:** Book reader (EPUB) › top bar › A−
- **Meaning:** Makes the book text smaller.
- **Example:** Fit more words on a small screen.

### `reader.larger`

- **Where:** Book reader (EPUB) › top bar › A+
- **Meaning:** Makes the book text larger.
- **Example:** Read comfortably from a distance.

### `reader.bookmark`

- **Where:** Book reader › top bar › ☆ bookmark
- **Meaning:** Saves this place, or removes the saved place.
- **Example:** Mark where you stopped for tonight.

### `pic.zoomOut`

- **Where:** Picture editor › crop sheet › −
- **Meaning:** Zooms the picture out.
- **Example:** See the whole picture while you crop.

### `pic.zoomIn`

- **Where:** Picture editor › crop sheet › +
- **Meaning:** Zooms the picture in.
- **Example:** Place the crop edge exactly.

### `library.cardMenu`

- **Where:** Library › a book card › ⋯ (also press and hold the card)
- **Meaning:** Opens more actions for this book or source.
- **Example:** Open its notes page or delete it.

### `audio.panelClose`

- **Where:** Audio panel › ✕ close
- **Meaning:** Closes the audio panel. Recording keeps going.
- **Example:** Hide the panel while a lecture records.

## Help lines (11)

Help lines are marked in the page with `data-help-line="<id>"`.

### `tracker.table`

- **Where:** Study tracker › under the table
- **Text:** Status, Last revised, Cards due, % correct and Card levels fill themselves in from your card reviews. Click a Status to set it yourself 📌.

### `tracker.levels`

- **Where:** Study tracker › under the table, second line
- **Text:** Card levels: New = not studied yet · Learning = comes back within a day · Familiar = back in 1–20 days · Mastered = back in 21+ days.

### `tracker.board`

- **Where:** Study tracker › above the board
- **Text:** Drag a lesson to another column to set its status yourself 📌. Drop it back on its own automatic column to hand it back to Auto.

### `tracker.statusRule`

- **Where:** Study tracker › inside the Status menu (how Auto works)
- **Text:** Auto: Not started = no cards answered yet · Learning = under 75% correct · Mastered = 90% or more correct, nothing due, no new cards, and at least 80% of the cards at level Mastered · Review = in between.

### `page.editor`

- **Where:** Page › under the title
- **Text:** Type / for blocks · [[ to link a page · # to add a tag · select words to hide them as a blank · the ⠿ handle beside a line › Make card.

### `review.ratings`

- **Where:** Review › under the Again / Hard / Good / Easy buttons
- **Text:** Again = you forgot it · Hard = you barely remembered · Good = you remembered · Easy = no effort at all.

### `review.practice`

- **Where:** Review › under Practice anyway
- **Text:** Practising doesn’t change when cards come back. New cards beyond today’s limit stay new.

### `db.table`

- **Where:** Database (not the Study tracker) › under the table
- **Text:** Click a cell to edit it. Click a column header to sort, filter or hide that column.

### `revise.how`

- **Where:** Notebook › Revise tab › top
- **Text:** In a note, select words and press Key point, Keyword, Must know or Formula in the toolbar. Marked words collect here, per lesson.

### `lock.privacy`

- **Where:** Lock screen and Settings › Lock › top
- **Text:** A privacy lock hides the page behind this screen. It is not encryption: it keeps casual eyes out, not experts.

### `reading.aloud`

- **Where:** Reading mode › Read aloud panel › top
- **Text:** Uses your device voice, free and offline where the voice allows. Words are marked as they are spoken.
