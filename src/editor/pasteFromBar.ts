import { t } from '../i18n/t'
import { adopterIn } from '../ink/inkTransfer'
import type { Editor } from './barActions'
import { insertPlainText, type Toast } from './clipboard'
import { pasteWith } from './pasteFlow'

/**
 * The selection bar's Paste (toolbar.v8 TB-33, decided 13 Nov 2026): the one
 * paste path of the page menus (PM-40 to PM-46). It reads the clipboard's
 * formatted text and gives it to the paste planner, so Settings › General ›
 * "Paste as" decides (Keep original by default). Plain text stays in
 * Paste ▾ and Ctrl/Cmd+Shift+V. If the browser will not give the formatted
 * clipboard, the plain text is pasted without an error. Drawings the
 * clipboard holds still paste as drawings.
 */
export async function pasteFromClipboard(
  editor: Editor,
  toast: Toast,
): Promise<void> {
  let html = ''
  let text = ''
  try {
    for (const item of await navigator.clipboard.read()) {
      if (!html && item.types.includes('text/html'))
        html = await (await item.getType('text/html')).text()
      if (!text && item.types.includes('text/plain'))
        text = await (await item.getType('text/plain')).text()
    }
  } catch {
    // Refused or not offered: fall back to the plain text below.
  }
  if (!html && !text) {
    try {
      text = await navigator.clipboard.readText()
    } catch {
      toast(t('paste.blocked'))
      return
    }
  }
  editor.focus()
  const go = () => {
    if (!pasteWith(editor, { html, text, own: false }, false))
      insertPlainText(editor, text)
  }
  const dom = editor.domElement
  const ink = dom ? adopterIn(dom) : null
  if (ink) ink.pasteLines(text, go)
  else go()
}
