/**
 * English text of Phase O (polish pack). Hindi and Spanish are hiO.ts and
 * esO.ts (machine drafts: mark for native review).
 */
export const enO = {
  // ---- Reading goal ----
  'reading.goal.label': 'Daily reading goal',
  'reading.goal.off': 'No goal',
  'reading.goal.min': '{count} min',
  'reading.goal.progress': 'Today: {done} of {goal} min',
  'reading.goal.reached': 'Goal reached today',
  'reading.goal.week_one': 'Goal reached on {count} day this week',
  'reading.goal.week_other': 'Goal reached on {count} days this week',
  // ---- Name it sheet and touch rows ----
  'nameSheet.newNotebook': 'Name your notebook',
  'nameSheet.newPage': 'Name your page',
  'sidebar.rowMenu': 'More for {name}',
  'help.tip.sidebar.rowMenu.meaning': 'Opens this row’s actions.',
  'help.tip.sidebar.rowMenu.example': 'Rename, lock, move or delete.',
  // ---- Write pad ----
  'tool.writePad': 'Write pad',
  'main.opt.insert.writePad': 'Write pad',
  'writePad.title': 'Write pad',
  'writePad.hint': 'On iPad, write here with Apple Pencil (Scribble)',
  'writePad.input': 'Write pad text',
  'writePad.placeholder': 'Write here',
  'writePad.previewEmpty': 'Your words appear here',
  'writePad.insert': 'Insert',
  'writePad.replace': 'Replace',
  'writePad.close': 'Close the Write pad',
  'writePad.resize': 'Drag to resize the pad',
  'writePad.zoomIn': 'Bigger writing',
  'writePad.zoomOut': 'Smaller writing',
  'writePad.space': 'Space',
  'writePad.newLine': 'New line',
  'writePad.delete': 'Delete',
  'writePad.color': 'Colour',
  'writePad.highlight': 'Highlight',
  'writePad.size': 'Size',
  'writePad.font': 'Font',
  'writePad.weight': 'Weight',
  'writePad.font.caveat': 'Caveat',
  'writePad.font.kalam': 'Kalam (Hindi)',
  'writePad.font.app': 'Normal',
  'writePad.weight.light': 'Light',
  'writePad.weight.normal': 'Normal',
  'writePad.weight.bold': 'Bold',
  'help.tip.writePad.insert.meaning':
    'Puts the written words into the page at the cursor.',
  'help.tip.writePad.insert.example': 'One Undo takes them out again.',
  'help.tip.writePad.replace.meaning':
    'Swaps the words you selected on the page for the written words.',
  'help.tip.writePad.replace.example':
    'Select a word, write a better one, tap Replace.',
  'help.tip.writePad.zoom.meaning':
    'Makes the writing in the pad bigger or smaller.',
  'help.tip.writePad.zoom.example': 'It does not change the text on the page.',
  'help.tip.writePad.resize.meaning':
    'Drag this edge up or down to change the pad height.',
  'help.tip.writePad.resize.example': 'Make it tall for long writing.',
  'help.tip.writePad.keys.meaning':
    'Adds a space or a new line, or deletes, in the pad.',
  'help.tip.writePad.keys.example':
    'Handy when your pencil cannot reach the keyboard.',
  'help.tip.writePad.close.meaning': 'Closes the Write pad.',
  'help.tip.writePad.close.example': 'Your page keeps everything you inserted.',
  // ---- Magnifier (Pencil fixes, 7 Nov) ----
  'ink.magnifier.hint':
    'Write big here. It lands small in the box on the page, which moves on by itself.',
  'ink.magnifier.boxLabel': 'Writing lands here · drag to move',
  'ink.magnifier.resize': 'Drag to make the writing pad taller or shorter',
  'ink.magnifier.erasing': 'Eraser: rub here to erase on the page',
  // ---- Lasso menu (owner design, 7 Nov) ----
  'ink.sel.more': 'More',
  'ink.sel.convert': 'Convert to text',
  'ink.sel.convertLater': 'Convert to text needs AI (Phase P), coming later.',
  'ink.sel.thickness': 'Thickness',
  'ink.sel.thin': 'Thin',
  'ink.sel.medium': 'Medium',
  'ink.sel.thick': 'Thick',
  'ink.sel.paste': 'Paste',
  'ink.sel.cutDone': 'Cut. Paste it from the ⋯ menu of a selection.',
  'ink.sel.cardHint': 'Picture copied: paste it into the card as the answer.',
  'ink.sel.summaryNeedsName':
    'Name this drawing first (⋯ › Name this drawing), then add it to the Summary.',
  'ink.mixed.moveNote':
    'Dragging moves the ink only: typed text flows with the page.',
  'main.opt.lasso.row': 'Actions in the menu row',
  'main.opt.lasso.rowNote': 'The others sit under ⋯ More.',
  'ai.convert.title': 'Convert to text',
  'ai.convert.picture': 'The picture of the selected ink',
  'ai.convert.send':
    'Only this picture of the selected ink is sent to {provider} ({host}). English and Hindi are read.',
  'ai.convert.go': 'Send',
  'ai.convert.reading': 'Reading…',
  'ai.convert.preview': 'The text (you can edit it)',
  'ai.convert.insert': 'Insert below',
  'ai.convert.replace': 'Replace the ink',
  'ai.convert.copy': 'Copy',
  'ai.convert.copied': 'Text copied.',
  'ai.convert.empty': 'No readable handwriting was found.',
  'ai.convert.inserted': 'Text added. Undo takes it back.',
  'ai.convert.needsAi':
    'This uses your own AI: turn it on and add a key in Settings › AI.',
  'ai.convert.maths': 'Maths to formula',
  'writePad.engine': 'Read with',
  'writePad.engine.scribble': 'Scribble',
  'writePad.engine.ai': 'AI',
  'writePad.ai.canvas': 'Writing area: write here with the pen',
  'writePad.ai.hint':
    'Write, then tap Read. Pen pressure sets each word’s weight.',
  'writePad.ai.read': 'Read',
  'writePad.ai.clear': 'Clear',
  'help.tip.writePad.engine.meaning':
    'Scribble reads writing on the iPad for free; AI sends a picture of your writing to your own AI key.',
  'help.tip.writePad.engine.example':
    'AI also reads Hindi and keeps how hard you pressed.',
  'help.tip.writePad.ai.read.meaning':
    'Sends a picture of what you wrote to your AI and shows the words above.',
  'help.tip.writePad.ai.read.example': 'Firm words come out bolder.',
  'help.tip.writePad.ai.clear.meaning': 'Wipes the writing area.',
  'help.tip.writePad.ai.clear.example': 'Nothing is sent.',
}
