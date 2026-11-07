import { createExtension } from '@blocknote/core'
import { NOTE_LINK, type NoteLinkProps } from './mapping'
import type { AppSchema } from './schema'

/**
 * Typing "[[" opens the link picker; picking inserts a note link in place
 * of the "[[". Kept apart from the picker UI so it can be tested with a
 * real editor.
 */

type Editor = AppSchema['BlockNoteEditor']

const LINK_TRIGGER = '[['

/** DOM event (bubbles from the editor) sent after "[" is typed. */
export const BRACKET_TYPED = 'learning-notes:bracket-typed'

/**
 * Editor extension: after the user types "[" (not paste), sends
 * `BRACKET_TYPED` once the editor has the new text, so the page can check
 * `linkTriggerAt`.
 */
export const linkTrigger = createExtension({
  key: 'learning-notes-link-trigger',
  mount: ({ dom, signal }) => {
    const typed = () =>
      setTimeout(() => {
        dom.dispatchEvent(new CustomEvent(BRACKET_TYPED, { bubbles: true }))
      }, 0)
    // The key (keyboards), and the input (phone keyboards send no key
    // name; on some lines desktop browsers send no input event).
    dom.addEventListener(
      'keydown',
      (e) => {
        if (e.key === '[' && !e.ctrlKey && !e.metaKey && !e.altKey) typed()
      },
      { signal },
    )
    dom.addEventListener(
      'input',
      (e) => {
        if ((e as InputEvent).data?.endsWith('[')) typed()
      },
      { signal },
    )
  },
  keyboardShortcuts: {
    // Opens the link next to the cursor (keyboard use), like a click.
    'Mod-Enter': ({ editor }) => {
      const pos = noteLinkAtCursor(editor)
      if (pos === null) return false
      const el = editor.prosemirrorView?.nodeDOM(pos)
      if (!(el instanceof HTMLElement)) return false
      const link = el.matches('.note-link')
        ? el
        : el.querySelector('.note-link')
      if (!(link instanceof HTMLElement)) return false
      link.click()
      return true
    },
  },
})

/** Position of a note link right before or after the cursor, or null. */
export function noteLinkAtCursor(editor: Editor): number | null {
  const { $from, empty } = editor.prosemirrorState.selection
  if (!empty) return null
  if ($from.nodeAfter?.type.name === NOTE_LINK) return $from.pos
  if ($from.nodeBefore?.type.name === NOTE_LINK) {
    return $from.pos - $from.nodeBefore.nodeSize
  }
  return null
}

/**
 * The cursor position when "[[" was just typed right before it (outside
 * code blocks), else null. Typing more after "[[" does not count, so
 * closing the picker leaves the brackets as text.
 */
export function linkTriggerAt(editor: Editor): number | null {
  const { $from, empty } = editor.prosemirrorState.selection
  if (!empty || !$from.parent.isTextblock) return null
  if (editor.getTextCursorPosition().block.type === 'codeBlock') return null
  const offset = $from.parentOffset
  if (offset < LINK_TRIGGER.length) return null
  // Leaf nodes (links, mentions) count as one character, like positions.
  const before = $from.parent.textBetween(
    offset - LINK_TRIGGER.length,
    offset,
    undefined,
    '￼',
  )
  return before === LINK_TRIGGER ? $from.pos : null
}

/**
 * Inserts a note link (and a space after it) at the cursor. With
 * `triggerPos` (from `linkTriggerAt`), the "[[" before it is replaced, if
 * it is still there.
 */
export function insertNoteLink(
  editor: Editor,
  link: NoteLinkProps,
  triggerPos: number | null = null,
): void {
  if (triggerPos !== null) {
    editor.transact((tr) => {
      const from = triggerPos - LINK_TRIGGER.length
      if (from < 0 || triggerPos > tr.doc.content.size) return
      if (tr.doc.textBetween(from, triggerPos) !== LINK_TRIGGER) return
      tr.delete(from, triggerPos) // the cursor moves back with the text
    })
  }
  editor.insertInlineContent([{ type: NOTE_LINK, props: { ...link } }, ' '])
}
