import { createContext, useContext } from 'react'

export const CardCtx = createContext<{ pick(): void }>({ pick: () => {} })
/** Tiles call this after a simple choice in a pick card. */
export const useCardPick = (): (() => void) => useContext(CardCtx).pick
