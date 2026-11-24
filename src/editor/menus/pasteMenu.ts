import { t } from '../../i18n/t'
import { readClipboardData } from '../appClipboard'
import { boxHost } from '../pasteBox'
import {
  choicesFor,
  insertBlocksAtCursor,
  openCleanup,
  planPaste,
  run,
  type PasteChoice,
  type PastePlan,
} from '../pasteFlow'
import type { AppSchema } from '../schema'

type Editor = AppSchema['BlockNoteEditor']

/**
 * What the clipboard allows in Paste ▾ (the planner's choices), or null when
 * the browser has not allowed a look yet. It never asks: a look is taken only
 * when the clipboard-read permission is already granted.
 */
export async function peekPasteForms(editor: Editor): Promise<string[] | null> {
  try {
    const p = await navigator.permissions?.query({
      name: 'clipboard-read' as PermissionName,
    })
    if (p?.state !== 'granted') return null
    const data = await readClipboardData()
    if (!data) return null
    const plan = planPaste(data) ?? {
      kind: 'text',
      text: data.text,
      rich: false,
    }
    const forms: string[] = choicesFor(plan, { box: !!boxHost(editor) })
    // Tab rows already paste as a table; "As table" stays listed for them.
    if (plan.kind === 'table' && !forms.includes('table')) forms.push('table')
    return forms
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
  anchor?: Element | null,
): Promise<void> {
  const data = await readClipboardData(anchor)
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
