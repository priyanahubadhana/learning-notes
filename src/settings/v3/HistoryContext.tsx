import {
  use,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { AppUiContext } from '../../app/appUi'
import { onRouted } from '../../app/input/eventRouter'
import type { LearningNotesDB } from '../../core/db'
import type { JsonValue } from '../../core/types'
import { t } from '../../i18n/t'
import { settingsRegistry } from '../builtinSettings'
import { setSetting, writeDeviceSetting } from '../settingsService'
import {
  createHistory,
  type HistoryEntry,
  type HistoryItem,
} from './settingsHistory'
import { Ctx, type Api } from './historyCtx'
import { writeVirtual } from './virtualWrites'
import { tv } from './tv'

const typing = (el: EventTarget | null) =>
  el instanceof Element &&
  !!el.closest(
    'input, textarea, select, [contenteditable=""], [contenteditable="true"]',
  )

/**
 * Settings Undo / Redo (SET-B10, B11, B14): its own history while Settings is
 * open, a toast with Undo, and Ctrl+Z / Ctrl+Y (Cmd on Mac) when no text field
 * has the focus. The stored value, the row and the preview all follow because
 * they read the stored value.
 */
export function SettingsHistoryProvider({
  db,
  children,
}: {
  db: LearningNotesDB
  children: ReactNode
}) {
  const { toast } = use(AppUiContext)
  const [history] = useState(createHistory)
  const [, bump] = useReducer((n: number) => n + 1, 0)

  const api = useMemo(() => {
    const write = async (id: string, value: JsonValue) => {
      if (writeVirtual(id, value)) return
      const def = settingsRegistry.get(id)
      if (!def) return
      try {
        if (def.scope === 'device') {
          writeDeviceSetting(def, value)
          def.onChange?.(value)
        } else await setSetting(db, def, value)
      } catch (error) {
        console.error(error)
        toast(t('settings.error.save'))
      }
    }
    const apply = (items: HistoryItem[], key: 'before' | 'after') =>
      Promise.all(items.map((i) => write(i.id, i[key])))
    const undo = () => {
      const e = history.undo()
      if (e) void apply([...e.items].reverse(), 'before')
      bump()
    }
    const redo = () => {
      const e = history.redo()
      if (e) void apply(e.items, 'after')
      bump()
    }
    return {
      record(entry: HistoryEntry, toastText?: string) {
        history.push(entry)
        bump()
        toast(toastText ?? tv('sv3.toastChanged', { name: entry.label }), {
          label: t('tool.undo'),
          onSelect: undo,
        })
      },
      write,
      undo,
      redo,
    }
  }, [db, toast, history])

  const live: Api = {
    ...api,
    canUndo: history.canUndo(),
    canRedo: history.canRedo(),
  }

  const keys = useRef(live)
  useEffect(() => {
    keys.current = live
  })
  useEffect(
    () =>
      onRouted(
        'keydown',
        (e) => {
          if (!(e.ctrlKey || e.metaKey) || e.altKey || typing(e.target)) return
          const k = e.key.toLowerCase()
          if (k === 'z' && !e.shiftKey) {
            e.preventDefault()
            keys.current.undo()
            return true
          }
          if (k === 'y' || (k === 'z' && e.shiftKey)) {
            e.preventDefault()
            keys.current.redo()
            return true
          }
        },
        { name: 'settings-v3-history' },
      ),
    [],
  )
  return <Ctx value={live}>{children}</Ctx>
}
