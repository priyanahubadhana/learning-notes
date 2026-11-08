import type { ChoiceRequest, ToastAction } from '../appUi'
import type { Editor } from '../../editor/barActions'
import type { Theme } from '../theme'

/**
 * What a tool needs to run. The app (App.tsx) registers `AppActions` once;
 * the page's editor registers itself while it is open; the short bar
 * registers its trays. A tool reads whatever it needs when it is run, so
 * the bar, the ribbon and the control panel all run tools the same way.
 */

export interface AppActions {
  toast: (message: string, action?: ToastAction) => void
  openSettings: (settingId?: string) => void
  openData: () => void
  openAllCards: () => void
  openDatabases: () => void
  openCalendar: () => void
  openToday: () => void
  openSearch: () => void
  openReview: (scope: 'all' | 'page') => void
  openControlPanel: () => void
  /** Asks a question with a few answers (see AppUi.choose). */
  choose: (request: ChoiceRequest) => Promise<string | null>
  openDevicePicker: () => void
  /** Shows the sidebar (a drawer on a phone). */
  showSidebar: () => void
  /** The open page's notebook tab: its Revise or Database tab. */
  openNotebookTab: (tab: 'revise' | 'database' | 'summary') => void
  cycleTheme: () => void
  /** Chooses a theme by name (the theme list's ▾). */
  setTheme: (theme: Theme) => void
  toggleFavourite: () => void
  /** Locks the open page or its notebook (or removes the lock). */
  lockCurrent: (kind: 'page' | 'notebook') => void
  /** The id of the open page (null on other screens). */
  currentPageId: () => string | null
}

/** Things only the open page's editor can do (it owns the pickers). */
export interface EditorExtras {
  insertDatabase: () => void
  insertTemplate: () => void
  saveAsTemplate?: () => void
  linkPage: () => void
  /** Camera: takes a photo (or picks one) and adds it as a picture. */
  takePhoto: () => void
  /** Insert › Picture: the chooser (Photos, Files, Camera, Paste). */
  choosePicture: () => void
}

/** The short bar's own trays, for tools that open one. */
export interface BarUi {
  openPanel: (panel: 'more' | 'menu' | 'color' | 'edit') => void
}

let app: AppActions | null = null
let editor: Editor | null = null
let extras: EditorExtras | null = null
let barUi: BarUi | null = null

export const setAppActions = (next: AppActions | null) => {
  app = next
}
export const getAppActions = () => app

export function setActiveEditor(
  nextEditor: Editor | null,
  nextExtras: EditorExtras | null,
) {
  editor = nextEditor
  extras = nextExtras
}
/** Only clears when `candidate` is still the registered editor. */
export function clearActiveEditor(candidate: Editor) {
  if (editor === candidate) {
    editor = null
    extras = null
  }
}
export const setBarUi = (next: BarUi | null) => {
  barUi = next
}

export interface Runner {
  app: AppActions | null
  editor: Editor | null
  extras: EditorExtras | null
  bar: BarUi | null
}

export const currentRunner = (): Runner => ({ app, editor, extras, bar: barUi })
