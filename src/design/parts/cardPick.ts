import { createContext, useContext } from 'react'

export const CardCtx = createContext<{ pick(): void }>({ pick: () => {} })
/** Tiles call this after a simple choice in a pick card. */
export const useCardPick = (): (() => void) => useContext(CardCtx).pick

/**
 * First control in the body; when the body has nothing focusable, the ✕
 * (never the card itself, which would draw a focus ring round the whole card).
 */
export function focusTarget(el: HTMLElement): HTMLElement {
  return (
    el.querySelector<HTMLElement>(
      '.pcard-body button:not([disabled]), .pcard-body input:not([disabled]), .pcard-body [tabindex="0"]',
    ) ??
    el.querySelector<HTMLElement>('[data-testid="pcard-close"]') ??
    el
  )
}
