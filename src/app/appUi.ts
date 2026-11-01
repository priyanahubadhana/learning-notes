import { createContext } from 'react'

/** Where the template picker was opened from. */
export type PickerMode = 'new' | 'insert'

/** A button inside a toast. */
export interface ToastAction {
  label: string
  onSelect: () => void
}

/** A small question with a few answers (see AppUi.choose). */
export interface ChoiceRequest {
  title: string
  message: string
  /** Buttons, in order; `primary` is the default (gets focus, Enter). */
  options: { value: string; label: string; primary?: boolean }[]
  /** Shows a "Change in Settings" link that opens this setting. */
  settingId?: string
}

/** App-wide UI services any component can use (provided by App). */
export interface AppUi {
  /**
   * Opens the template picker. Resolves to the chosen template's id,
   * '' for "Blank page" (only in 'new' mode), or null if cancelled.
   */
  chooseTemplate: (mode: PickerMode) => Promise<string | null>
  /** Shows a short message at the bottom of the screen, with an optional action (e.g. Undo). */
  toast: (message: string, action?: ToastAction) => void
  /** Asks a question; resolves to the chosen value, or null if cancelled. */
  choose: (request: ChoiceRequest) => Promise<string | null>
  /** Opens Settings, optionally at one setting (highlighted). */
  openSettings: (settingId?: string) => void
}

export const AppUiContext = createContext<AppUi>({
  chooseTemplate: async () => null,
  toast: () => {},
  choose: async () => null,
  openSettings: () => {},
})

/** Where a screen can put its own items in the top bar (null until shown). */
export const TopBarSlotContext = createContext<HTMLElement | null>(null)

/** Same as the phone variant in index.css. */
export const PHONE_SCREEN = '(width < 40rem), (height < 32rem)'
