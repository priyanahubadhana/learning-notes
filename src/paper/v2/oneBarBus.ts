/**
 * Small messages between the one bar, the ⋯ list and the cards (box bar part
 * A). A plain list of listeners, so the lazy parts need not know each other
 * and no raw DOM event listener is added (check:ratchet).
 */
export type OneBarPop =
  'colour' | 'size' | 'font' | 'bi' | 'align' | 'list' | 'paste'

type Message =
  /** The phone's ⋯ list opens Font, List or Paste on the bar. */
  | { kind: 'pop'; boxId: string; pop: OneBarPop }
  /** ⋯ › Text options…: the Text tool's Format card for a box. */
  | { kind: 'text'; boxId: string }
  /** ⋯ › Layout…: the Box card on its Layout tab. */
  | { kind: 'layout'; boxId: string }

const listeners = new Set<(m: Message) => void>()

export const listenOneBar = (fn: (m: Message) => void): (() => void) => {
  listeners.add(fn)
  return () => void listeners.delete(fn)
}
const send = (m: Message) => listeners.forEach((fn) => fn(m))

export const openOneBarPop = (boxId: string, pop: OneBarPop) =>
  send({ kind: 'pop', boxId, pop })
export const openTextOptions = (boxId: string) => send({ kind: 'text', boxId })
export const openBoxLayout = (boxId: string) => send({ kind: 'layout', boxId })
