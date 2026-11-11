import { describe, expect, it } from 'vitest'

// B3-12: a toast only for errors, how-to-fix hints or actions you cannot see;
// deletes keep an Undo. These "done" messages must never come back.
const QUIET = [
  'copy.done',
  'paste.done',
  'reading.bookmarkAdded',
  'bookreader.bookmarked',
  'reading.highlighted',
  'layout.done',
  'settings.toolbarReset.done',
  'settings.pillReset.done',
  'editor.templateInserted',
  'tree.moved',
  'annot.noteSaved',
  'annot.saved',
  'ink.hl.saved',
  'annot.savedTo',
  'ink.sel.saved',
  'prompts.saved',
  'prompts.rated',
  'prompts.undone',
  'tabs.mindMap.made',
  'ink.card.made',
  'recall.cardMade',
  'ink.fav.saved',
  'ink.layers.merged',
  'ai.convert.copied',
  'annot.exportCopied',
  'settings.slowMomentsCopy.done',
  'settings.toolStateCopy.done',
  'keys.listening',
  'ai.working',
  'reading.find.nextPage',
  'paper.box.movedMany',
  'pasteChooser.boxMade',
  'lock.removed',
  'reader.syncFurthest.done',
]
// Deletes keep their Undo toast.
const KEPT = ['reading.bookmarkRemoved', 'annot.removed', 'prompts.deleted']

const sources = import.meta.glob(['/src/**/*.ts', '/src/**/*.tsx'], {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

const callsOf = (key: string) =>
  Object.entries(sources)
    .filter(([file]) => !/\.test\.tsx?$/.test(file) && !/i18n\//.test(file))
    .filter(([, text]) => text.replace(/\s+/g, '').includes(`toast(t('${key}'`))
    .map(([file]) => file)

describe('toast noise (B3-12)', () => {
  it.each(QUIET)('%s is no longer shown as a toast', (key) => {
    expect(callsOf(key)).toEqual([])
  })
  it.each(KEPT)('%s (a delete) still offers Undo', (key) => {
    expect(callsOf(key).length).toBeGreaterThan(0)
  })
})
