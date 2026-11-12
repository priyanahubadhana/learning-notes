import { createContext, use } from 'react'
import type { JsonValue } from '../../core/types'
import type { HistoryEntry } from './settingsHistory'

export interface Api {
  /** Records a step already written, and shows its toast with Undo. */
  record(entry: HistoryEntry, toastText?: string): void
  /** Writes a value the way a row does (database or this device). */
  write(id: string, value: JsonValue): Promise<void>
  undo(): void
  redo(): void
  canUndo: boolean
  canRedo: boolean
}

export const Ctx = createContext<Api | null>(null)
export const useSettingsHistory = (): Api => {
  const api = use(Ctx)
  if (!api) throw new Error('SettingsHistory is missing')
  return api
}
