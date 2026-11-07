import { barOrder, extraTools, mainList, type MainTool } from './mainTools'

/**
 * The order of everything on the main bar (R7-11, R7-12): the main tools and
 * the pinned tools in ONE list, so a pinned tool can sit between Pen and
 * Eraser, or first. Tokens are "m:<main tool>" and "x:<tool id>".
 *
 * `toolbar.main` and `toolbar.extras` still say WHICH tools are on the bar;
 * `toolbar.order` only says in which order. A token in the order that is no
 * longer on the bar is ignored, and a tool on the bar that the order does
 * not know yet goes last, so the three can never disagree.
 */

export const mainToken = (id: string) => `m:${id}`
export const toolToken = (id: string) => `x:${id}`

/** The tokens on the bar now, in order. */
export function resolveBar(
  order: readonly string[],
  main: readonly string[],
  extras: readonly string[],
): string[] {
  const present = new Set([...main.map(mainToken), ...extras.map(toolToken)])
  const out = order.filter((tok) => present.has(tok))
  const seen = new Set(out)
  for (const tok of [...main.map(mainToken), ...extras.map(toolToken)]) {
    if (!seen.has(tok)) out.push(tok)
  }
  return out
}

/** The bar as it is saved right now. */
export const currentBar = (): string[] =>
  resolveBar(barOrder.get(), mainList.get(), extraTools.get())

/** Saves a whole bar: which tools, and in which order. */
export function saveBar(tokens: readonly string[]): void {
  const main = tokens
    .filter((t) => t.startsWith('m:'))
    .map((t) => t.slice(2)) as MainTool[]
  const extras = tokens.filter((t) => t.startsWith('x:')).map((t) => t.slice(2))
  mainList.set(main)
  extraTools.set(extras)
  barOrder.set([...tokens])
}

/**
 * Pins a tool to the bar (R7-12). It goes where it was dropped; with no
 * place given, first (not last, where it would be hidden off the end).
 */
export function pinTool(id: string, index = 0): void {
  const bar = currentBar()
  const token = toolToken(id)
  if (bar.includes(token)) return
  const next = [...bar]
  next.splice(Math.min(next.length, Math.max(0, index)), 0, token)
  saveBar(next)
}

/** Takes a pinned tool off the bar. */
export function unpinTool(id: string): void {
  saveBar(currentBar().filter((tok) => tok !== toolToken(id)))
}
