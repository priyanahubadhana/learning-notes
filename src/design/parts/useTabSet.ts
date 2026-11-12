import { useCallback, useMemo, useRef, useState } from 'react'
import type { IconName } from '../../app/tools/icons'
import {
  addCustomTab,
  addTab,
  defaultTabSet,
  loadTabSet,
  localTabSetStore,
  moveTab,
  removeTab,
  renameTab,
  saveTabSet,
  type TabSetData,
  type TabSetStore,
} from './tabSets'

export type TabDef = {
  id: string
  label: string
  icon?: IconName
  /** Unlock id: the tab shows only when this Professional feature is on. */
  pro?: string
  custom?: boolean
  /** What a custom tab points at. */
  source?: string
}

/** A thing a custom tab can point at (a saved filter, a shelf...). */
export type TabSource = { id: string; label: string }

export interface TabSet {
  data: TabSetData
  /** The tabs in order, with renames and custom tabs applied. */
  tabs: TabDef[]
  canUndo: boolean
  add(id: string): void
  addCustom(label: string, source?: string): void
  remove(id: string): void
  move(from: number, to: number): void
  rename(id: string, label: string): void
  reset(): void
  undo(): void
}

/**
 * State of one tab row: loads the saved set (validated), applies each change
 * at once, saves it, and keeps an undo stack so every edit step can be undone.
 */
export function useTabSet(
  setKey: string,
  catalog: readonly TabDef[],
  defaults: readonly string[],
  store: TabSetStore = localTabSetStore,
): TabSet {
  const catalogIds = useMemo(() => new Set(catalog.map((c) => c.id)), [catalog])
  const [data, setData] = useState<TabSetData>(() =>
    loadTabSet(store, setKey, catalogIds, defaults),
  )
  const [past, setPast] = useState<TabSetData[]>([])
  const ref = useRef(data)

  const apply = useCallback(
    (next: TabSetData, record = true) => {
      const cur = ref.current
      if (next === cur) return
      ref.current = next
      setData(next)
      if (record) setPast((p) => [...p.slice(-49), cur])
      if (
        next.ids.join() === defaults.join() &&
        !Object.keys(next.custom).length &&
        !Object.keys(next.labels).length
      )
        store.remove(setKey)
      else saveTabSet(store, setKey, next)
    },
    [defaults, setKey, store],
  )

  const tabs = useMemo<TabDef[]>(
    () =>
      data.ids.flatMap((id): TabDef[] => {
        const c = data.custom[id]
        if (c) return [{ id, label: c.label, custom: true, source: c.source }]
        const def = catalog.find((x) => x.id === id)
        return def ? [{ ...def, label: data.labels[id] ?? def.label }] : []
      }),
    [data, catalog],
  )

  return {
    data,
    tabs,
    canUndo: past.length > 0,
    add: (id) => apply(addTab(ref.current, id)),
    addCustom: (label, source) =>
      apply(addCustomTab(ref.current, label, source)),
    remove: (id) => apply(removeTab(ref.current, id)),
    move: (from, to) => apply(moveTab(ref.current, from, to)),
    rename: (id, label) => apply(renameTab(ref.current, id, label)),
    reset: () => {
      store.remove(setKey)
      const base = defaultTabSet(defaults)
      const cur = ref.current
      ref.current = base
      setData(base)
      setPast((p) => [...p.slice(-49), cur])
    },
    undo: () => {
      const prev = past[past.length - 1]
      if (!prev) return
      setPast(past.slice(0, -1))
      ref.current = prev
      setData(prev)
      saveTabSet(store, setKey, prev)
    },
  }
}
