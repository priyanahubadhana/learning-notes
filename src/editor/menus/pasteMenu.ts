import { t } from '../../i18n/t'
import { boxHost } from '../pasteBox'
import {
  choicesFor,
  insertBlocksAtCursor,
  openCleanup,
  planPaste,
  run,
  type PasteChoice,
  type PasteData,
  type PastePlan,
} from '../pasteFlow'
import type { AppSchema } from '../schema'

type Editor = AppSchema['BlockNoteEditor']

/** Reads the clipboard (HTML and text). Null when it is empty or refused. */
export async function readClipboardData(): Promise<PasteData | null> {
  try {
    const items = (await navigator.clipboard.read?.()) ?? []
    let html = ''
    let text = ''
    for (const item of items) {
      if (item.types.includes('text/html')) {
        html = await (await item.getType('text/html')).text()
      }
      if (item.types.includes('text/plain')) {
        text = await (await item.getType('text/plain')).text()
      }
    }
    if (html || text) return { html, text, own: false }
  } catch {
    // Fall through to the plain-text read.
  }
  try {
    const text = await navigator.clipboard.readText()
    return text ? { html: '', text, own: false } : null
  } catch {
    return null
  }
}

/**
 * A pick of the strip's Paste ▾ (PM-41): reads the clipboard and pastes in
 * that form. A form that does not fit this clipboard pastes as it was
 * copied, never nothing. The paste is one Undo step (applyPaste transacts).
 */
export async function pasteIn(
  editor: Editor,
  form: string,
  toast: (message: string) => void,
): Promise<void> {
  const data = await readClipboardData()
  if (!data) return toast(t('pageMenus.pasteEmpty'))
  editor.focus()
  const plan: PastePlan = planPaste(data) ?? {
    kind: 'text',
    text: data.text,
    rich: false,
  }
  const choices = choicesFor(plan, { box: !!boxHost(editor) })
  if (form === 'quote') {
    editor.transact(() =>
      insertBlocksAtCursor(editor, [{ type: 'quote', content: plan.text }]),
    )
    return
  }
  if (form === 'cleanup') {
    if (choices.includes('cleanup')) return openCleanup(editor, plan)
    form = 'keep'
  }
  const choice = (
    choices.includes(form as PasteChoice) ? form : 'keep'
  ) as PasteChoice
  // "Plain text" is always possible, even when the clipboard is plain already.
  await run(editor, plan, choices, form === 'plain' ? 'plain' : choice)
}
