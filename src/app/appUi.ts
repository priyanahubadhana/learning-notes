import { createContext } from 'react'

/** Where the template picker was opened from. */
export type PickerMode = 'new' | 'insert'

/** A button inside a toast. */
export interface ToastAction {
  label: string
  onSelect: () => void
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
}

export const AppUiContext = createContext<AppUi>({
  chooseTemplate: async () => null,
  toast: () => {},
})
