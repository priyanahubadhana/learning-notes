import {
  glideTo,
  landOn,
  prefersReducedMotion,
  targetTopFor,
} from '../../reading/glide'

/** Opens a closed toggle (the block itself when `self`, and every toggle around it). */
export function openToggles(el: HTMLElement, self: boolean): void {
  const open = (outer: Element | null) => {
    const button = outer?.querySelector<HTMLElement>(
      ':scope > .bn-block > .bn-toggle-wrapper > .bn-toggle-button, :scope .bn-toggle-button',
    )
    if (button?.getAttribute('aria-expanded') === 'false') button.click()
  }
  for (
    let o = el.parentElement?.closest('.bn-block-outer') ?? null;
    o;
    o = o.parentElement?.closest('.bn-block-outer') ?? null
  ) {
    open(o)
  }
  if (self) open(el)
}

const blockEl = (id: string) =>
  document.querySelector<HTMLElement>(
    `.bn-block-outer[data-id="${CSS.escape(id)}"]`,
  )

/** NB-B49: the page glides to the heading (opening any Toggle around it). */
export function glideToBlock(id: string, isToggle: boolean): boolean {
  const el = blockEl(id)
  const scroller = document.querySelector<HTMLElement>('[data-page-scroller]')
  if (!el || !scroller) return false
  openToggles(el, isToggle)
  // The page grows when a toggle opens: scroll once it has settled.
  window.setTimeout(
    () => {
      const now = blockEl(id) ?? el
      glideTo(scroller, targetTopFor(scroller, now), 600, {
        instant: prefersReducedMotion(),
      })
      landOn(now)
    },
    isToggle ? 60 : 0,
  )
  return true
}

/** Waits for a page that is opening to show the block, then glides to it. */
export function glideWhenReady(id: string, isToggle: boolean): void {
  const started = Date.now()
  const timer = window.setInterval(() => {
    if (glideToBlock(id, isToggle) || Date.now() - started > 5000)
      window.clearInterval(timer)
  }, 120)
}

/** The last heading that has reached the top part of the page being read. */
export function headingAtTop(ids: readonly string[]): string | null {
  const scroller = document.querySelector<HTMLElement>('[data-page-scroller]')
  if (!scroller) return null
  const top = scroller.getBoundingClientRect().top
  let current: string | null = null
  for (const id of ids) {
    const el = blockEl(id)
    if (!el) continue
    if (el.getBoundingClientRect().top - top <= 80) current = id
    else break
  }
  return current
}
