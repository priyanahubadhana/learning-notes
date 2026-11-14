import { useEffect, type RefObject } from 'react'
import { clearInput, wantsClear } from './clearInput'
import { tp } from './tp'
import { PRIORITY, onRouted } from '../../app/input/eventRouter'
import './ClearField.css'

type Field = HTMLInputElement | HTMLTextAreaElement

/**
 * Adds the ✕ to every system text field inside `root` (search, rename, add
 * topic...), including ones that appear later. Skips `data-noclr`, password
 * and other non-text types, disabled/read-only fields and fields that already
 * have one (ClearField). Plain DOM, for screens that still render their own
 * `<input>`. Returns a function that removes everything it added.
 */
export function attachAutoClear(root: HTMLElement): () => void {
  const added = new Map<Field, HTMLButtonElement>()
  const sync = (el: Field, btn: HTMLButtonElement) => {
    btn.hidden = !el.value || el.disabled || el.readOnly
  }
  const attach = (el: Field) => {
    if (added.has(el) || !wantsClear(el)) return
    if (el.closest('.clr-wrap') || !el.parentElement) return
    if (el.disabled || el.readOnly) return
    const parent = el.parentElement
    if (getComputedStyle(parent).position === 'static')
      parent.classList.add('clr-auto-host')
    el.classList.add('clr-field')
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'clr-btn'
    btn.setAttribute('data-auto', '1')
    btn.setAttribute('data-testid', 'clr-btn')
    const name = el.getAttribute('aria-label') || el.getAttribute('placeholder')
    btn.setAttribute(
      'aria-label',
      name ? tp('parts.clear.named', { name }) : tp('parts.clear.label'),
    )
    btn.textContent = '✕'
    btn.style.opacity = '1'
    btn.style.pointerEvents = 'auto'
    el.after(btn)
    sync(el, btn)
    added.set(el, btn)
  }
  const fieldOf = (t: EventTarget | null): Field | null => {
    if (!(t instanceof Element)) return null
    const b = t.closest('.clr-btn')
    for (const [el, btn] of added) if (btn === b || el === t) return el
    return null
  }
  const isBtn = (t: EventTarget | null) =>
    t instanceof Element && !!t.closest('.clr-btn[data-auto]')
  const scope = { scope: root, name: 'auto-clear' }
  const offs = [
    // Keep focus in the field when the ✕ is pressed.
    onRouted(
      'pointerdown',
      (e) => {
        if (isBtn(e.target) && fieldOf(e.target)) e.preventDefault()
      },
      scope,
    ),
    onRouted(
      'click',
      (e) => {
        const el = isBtn(e.target) ? fieldOf(e.target) : null
        if (!el) return
        clearInput(el)
        sync(el, added.get(el)!)
        return true
      },
      scope,
    ),
    onRouted(
      'input',
      (e) => {
        const el = fieldOf(e.target)
        if (el) sync(el, added.get(el)!)
      },
      scope,
    ),
    // Esc clears first; above the overlay so an open card stays open.
    onRouted(
      'keydown',
      (e) => {
        const el = fieldOf(e.target)
        if (!el || e.key !== 'Escape' || !el.value || isBtn(e.target)) return
        e.preventDefault()
        e.stopPropagation()
        clearInput(el)
        sync(el, added.get(el)!)
        return true
      },
      { ...scope, priority: PRIORITY.modal + 1 },
    ),
  ]
  const scan = () =>
    root.querySelectorAll<Field>('input, textarea').forEach(attach)
  scan()
  const mo = new MutationObserver(scan)
  mo.observe(root, { childList: true, subtree: true })
  return () => {
    mo.disconnect()
    offs.forEach((off) => off())
    added.forEach((btn) => btn.remove())
    added.clear()
  }
}

/** Hook form: `useAutoClear(ref)` on a screen's root element. */
export function useAutoClear(ref: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const el = ref.current
    return el ? attachAutoClear(el) : undefined
  }, [ref])
}
