import { activeTool } from '../app/tools/main/mainTools'
import { tapTwiceActive } from './penMode'
import type { AppSchema } from './schema'

/**
 * When the on-screen keyboard opens (owner, after trying 3a on an iPad: it
 * opened far too often with the Apple Pencil). A pen tap focuses the page,
 * and iOS then shows the keyboard. So:
 *  - a FINGER tap or a key press: inputmode "text", the keyboard as usual;
 *  - a PENCIL tap under the Text tool: the cursor is placed for Scribble but
 *    the page says inputmode "none", so no keyboard (⌨ on the bar shows it);
 *  - a Pencil tap under Pen, Highlighter, Eraser, Lasso or Read: the page is
 *    not focused at all, and any focus it had is dropped.
 * Nothing here changes what is typed; it only decides about focus and
 * inputmode.
 */

type Editor = AppSchema['BlockNoteEditor']

/** Which tools leave the page alone when the Pencil taps it. */
export const pencilFocuses = (tool: string): boolean => tool === 'text'

/** What a Pencil tap does on the page under the Text tool (two-tap rule). */
export type PencilTap = 'place' | 'activate'

/**
 * Pure rule. With "tap twice" on: a block that has words is only activated
 * (outline, no caret) by a first tap; a second tap in the active block places
 * the caret. An empty block or blank space takes the caret at once. Off: the
 * caret always.
 */
export function pencilTapAction(input: {
  tapTwice: boolean
  blockHasWords: boolean
  activeId: string | null
  blockId: string | null
}): PencilTap {
  if (!input.tapTwice || !input.blockId || !input.blockHasWords) return 'place'
  return input.activeId === input.blockId ? 'place' : 'activate'
}

/** The block with the outline (the first tap of the two-tap rule). */
let activeBlockId: string | null = null
export const activeBlock = () => activeBlockId

/** The inputmode a pointer asks for: a pen never opens the keyboard by itself. */
export const inputModeFor = (pointerType: string): 'none' | 'text' =>
  pointerType === 'pen' ? 'none' : 'text'

export function setKeyboard(editor: Editor, on: boolean): void {
  const dom = editor.domElement
  if (!dom) return
  dom.setAttribute('inputmode', on ? 'text' : 'none')
  if (on) editor.focus()
  else if (dom.contains(dom.ownerDocument.activeElement)) {
    // Dropping focus is what hides the keyboard; the cursor stays in the page.
    ;(dom.ownerDocument.activeElement as HTMLElement).blur()
  }
}

export function watchKeyboardPolicy(editor: Editor): () => void {
  const dom = editor.domElement
  if (!dom) return () => {}
  const doc = dom.ownerDocument

  const clearActive = () => {
    activeBlockId = null
    dom
      .querySelectorAll('[data-active-block]')
      .forEach((el) => el.removeAttribute('data-active-block'))
  }
  const flash = (id: string | null) => {
    if (!id) return
    const el = dom.querySelector('.bn-block[data-id="' + CSS.escape(id) + '"]')
    if (!el) return
    el.setAttribute('data-caret-flash', '')
    window.setTimeout(() => el.removeAttribute('data-caret-flash'), 320)
  }
  /** The block under a pen tap and whether it holds words. */
  const blockOf = (target: EventTarget | null) => {
    const el =
      target instanceof Element ? target.closest('.bn-block[data-id]') : null
    if (!el || !dom.contains(el)) return { id: null, words: false }
    const content = el.querySelector(':scope > .bn-block-content')
    return {
      id: (el as HTMLElement).dataset.id ?? null,
      words: (content?.textContent ?? '').trim() !== '',
    }
  }
  /** Taps on the page that are not on text (links, buttons, pictures) are left alone. */
  const plainText = (t: EventTarget | null) =>
    t instanceof Element &&
    dom.contains(t) &&
    !t.closest('a, button, input, textarea, select') &&
    // The page itself is briefly not editable during a Lasso stroke (penSelect).
    [null, dom].includes(t.closest('[contenteditable="false"]'))

  const applyMark = () => {
    if (!activeBlockId) return
    dom
      .querySelector('.bn-block[data-id="' + CSS.escape(activeBlockId) + '"]')
      ?.setAttribute('data-active-block', '')
  }
  const mark = (id: string) => {
    clearActive()
    activeBlockId = id
    applyMark()
  }
  // The editor redraws a block when the selection moves and drops attributes it
  // does not know: put the outline back.
  const offSelection = editor.onSelectionChange(() =>
    requestAnimationFrame(applyMark),
  )

  const onPointer = (e: PointerEvent) => {
    if (e.button > 0 || e.pointerType === 'mouse') return
    // A finger tap: one tap places the caret (it always pans and zooms).
    if (e.pointerType === 'touch') clearActive()
    dom.setAttribute('inputmode', inputModeFor(e.pointerType))
    if (e.pointerType !== 'pen' || !e.cancelable) return
    const tool = activeTool.get()
    const onText = plainText(e.target)
    const { id, words } = blockOf(e.target)
    if (tool === 'text' || tool === 'lasso') {
      // The two-tap rule. Text: if "tap twice" is on. Lasso: always.
      const twice = tool === 'lasso' || tapTwiceActive()
      if (onText && id) {
        // Lasso: a blank line or new block takes no caret (a stroke there is a lasso).
        if (tool === 'lasso' && !words) {
          e.preventDefault()
          return
        }
        const action = pencilTapAction({
          tapTwice: twice,
          blockHasWords: words,
          activeId: activeBlockId,
          blockId: id,
        })
        if (action === 'activate') {
          // First tap: the block is only marked. No caret, no keyboard.
          e.preventDefault()
          mark(id)
          if (dom.contains(doc.activeElement))
            (doc.activeElement as HTMLElement).blur()
          return
        }
        // Second tap (or an empty block under Text): the caret lands where tapped.
        if (twice) {
          clearActive()
          flash(id)
        }
      }
      return
    }
    // Pen, Highlighter, Eraser, Read: the Pencil never focuses the page.
    if (dom.contains(e.target as Node)) e.preventDefault()
  }
  const onTouch = (e: TouchEvent) => {
    // Ink tools: the Pencil draws, a finger scrolls. Under Read and Lasso the
    // Pencil can still scroll (a flick, or a drag from the margins).
    if (
      !['pen', 'highlighter', 'eraser'].includes(activeTool.get()) ||
      !e.cancelable
    )
      return
    const stylus = Array.from(e.changedTouches).some(
      (touch) =>
        (touch as Touch & { touchType?: string }).touchType === 'stylus',
    )
    if (stylus && e.target instanceof Node && dom.contains(e.target)) {
      e.preventDefault()
    }
  }
  const onKey = (e: KeyboardEvent) => {
    if (!e.ctrlKey && !e.metaKey) dom.setAttribute('inputmode', 'text')
    // A hardware key with words selected (a Pencil selection leaves the page
    // unfocused): the page takes the key.
    const view = editor.prosemirrorView
    if (
      view &&
      !view.state.selection.empty &&
      !dom.contains(doc.activeElement) &&
      !(doc.activeElement instanceof HTMLInputElement) &&
      !(doc.activeElement instanceof HTMLTextAreaElement) &&
      !(doc.activeElement instanceof HTMLSelectElement) &&
      !e.ctrlKey &&
      !e.metaKey &&
      !e.altKey &&
      (e.key.length === 1 || e.key === 'Backspace' || e.key === 'Delete')
    ) {
      dom.focus({ preventScroll: true })
    }
  }
  // Choosing a non-text tool drops the page's focus (and its keyboard).
  const off = activeTool.subscribe(() => {
    if (pencilFocuses(activeTool.get())) return
    dom.setAttribute('inputmode', 'none')
    if (dom.contains(doc.activeElement))
      (doc.activeElement as HTMLElement).blur()
  })
  doc.addEventListener('pointerdown', onPointer, true)
  doc.addEventListener('touchstart', onTouch, { capture: true, passive: false })
  doc.addEventListener('keydown', onKey, true)
  return () => {
    offSelection?.()
    off()
    doc.removeEventListener('pointerdown', onPointer, true)
    doc.removeEventListener('touchstart', onTouch, true)
    doc.removeEventListener('keydown', onKey, true)
    dom.removeAttribute('inputmode')
  }
}
