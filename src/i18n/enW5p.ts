/**
 * English text of polish pass 1 (help tips for Home, the readers, the
 * picture editor and Audio). Hindi and Spanish are hiW5p.ts and esW5p.ts
 * (machine drafts: mark for native review).
 */
export const enW5p = {
  // ---- Help tips (item 1) ----
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
  // ---- Row actions by touch (item 2) ----
  'library.cardMenu': 'More actions',
  'library.openNotes': 'Open notes page',
  'help.tip.library.cardMenu.meaning':
    'Opens more actions for this book or source.',
  'help.tip.library.cardMenu.example': 'Open its notes page or delete it.',
  // ---- Large data (item 5) ----
  'home.completed.older': 'Show older',
  // ---- Big files (item 6) ----
  'library.saving': 'Saving {name}…',
  'library.bigFile': 'Big files may not open on iPad. Importing it anyway.',
  // ---- AI results: preview, keep, remove (item 7) ----
  'ai.previewTitle': 'Check the AI result',
  'ai.previewSummary': 'Summary from your AI',
  'ai.previewKeyPoints': 'Key points from your AI',
  'ai.previewHelp':
    'Nothing is added until you press Add to page. You can edit the text first.',
  'ai.previewText': 'AI text',
  'ai.previewEdit': 'Edit first',
  'ai.previewApply': 'Add to page',
  'capture.keepAi': 'Keep as mine',
  'capture.keepAiDone': 'Kept as yours. It is no longer marked as AI-made.',
  // ---- Empty screens (item 8) ----
  'empty.decks.action': 'Make your first deck',
  'empty.library.action': 'Import a book',
  'empty.tasks.action': 'Add a task',
  'empty.routines':
    'No habits yet. Start with one small habit for your morning.',
  'empty.routines.action': 'Add a habit',
  'empty.audio.action': 'Record now',
  // ---- Kinder defaults (item 10) ----
  'settings.newPerDay.minutes': 'About {minutes} min a day at your pace.',
  'templates.mem.example': 'Example:',
  'templates.mem.palace.example':
    'Front door: a giant clock rings when you open it (the year of the treaty).',
  'templates.mem.vivid.example':
    'To remember “photosynthesis”, picture a green leaf in sunglasses sunbathing.',
  'templates.mem.major.example': '314 is M T R: “matter”.',
  'templates.mem.pao.example':
    '07: James Bond (person) shaking a martini (action) at a casino (object).',
  'templates.mem.acronym.example':
    'ROY G BIV: Red, Orange, Yellow, Green, Blue, Indigo, Violet.',
  'templates.mem.story.example':
    'Words: dog, key, moon. Story: a dog finds a key and unlocks the moon.',
  // ---- Offline and refused (item 11) ----
  'embed.copyLink': 'Copy link',
  'embed.linkCopied': 'Link copied.',
  'file.notHere': 'File not on this device.',
  'file.notHereSync': 'If Sync is on, it can arrive after the next sync.',
  'camera.refused':
    'The camera is off for this site. On iPad: Settings › Safari › Camera, then choose Ask or Allow.',
} as const
