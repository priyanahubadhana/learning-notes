import { useEffect, type RefObject } from 'react'
import { clearInput, wantsClear } from './clearInput'
import { tp } from './tp'
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
    btn.addEventListener('pointerdown', (e) => e.preventDefault())
    btn.addEventListener('click', () => {
      clearInput(el)
      sync(el, btn)
    })
    el.addEventListener('input', () => sync(el, btn))
    el.addEventListener('keydown', (e) => {
      if ((e as KeyboardEvent).key === 'Escape' && el.value) {
        e.preventDefault()
        e.stopPropagation()
        clearInput(el)
        sync(el, btn)
      }
    })
    el.after(btn)
    sync(el, btn)
    added.set(el, btn)
  }
  const scan = () =>
    root.querySelectorAll<Field>('input, textarea').forEach(attach)
  scan()
  const mo = new MutationObserver(scan)
  mo.observe(root, { childList: true, subtree: true })
  return () => {
    mo.disconnect()
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
