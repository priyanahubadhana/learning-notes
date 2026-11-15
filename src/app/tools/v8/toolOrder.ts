import { prefStore } from '../store'
import type { V8ToolId } from './registryV8'

/**
 * The order of a tool's own chips on its row (v9 Organise: tools can be moved,
 * never removed). Saved on this device only: tool id -> chip ids. A tool with
 * no entry shows the default order.
 */
type Order = Partial<Record<string, string[]>>
const isOrder = (v: unknown): v is Order =>
  !!v &&
  typeof v === 'object' &&
  !Array.isArray(v) &&
  Object.values(v).every(
    (l) => Array.isArray(l) && l.every((x) => typeof x === 'string'),
  )

export const toolOrder = prefStore<Order>('toolbar.v9.toolOrder', isOrder, {})

/** `items` in the saved order: unknown ids are dropped, new items go last. */
export function orderItems<T extends { id: string }>(
  items: readonly T[],
  saved: readonly string[] | undefined,
): readonly T[] {
  if (!saved || saved.length === 0) return items
  const byId = new Map(items.map((i) => [i.id, i]))
  const first = saved.flatMap((id) => {
    const it = byId.get(id)
    byId.delete(id)
    return it ? [it] : []
  })
  return [...first, ...byId.values()]
}

/** Saves the order of one tool's chips (the default order is saved as nothing). */
export function setToolOrder(
  tool: V8ToolId,
  ids: readonly string[] | undefined,
  defaults: readonly string[] = [],
): void {
  const next = { ...toolOrder.get() }
  if (!ids || ids.join() === defaults.join()) delete next[tool]
  else next[tool] = [...ids]
  toolOrder.set(next)
}
