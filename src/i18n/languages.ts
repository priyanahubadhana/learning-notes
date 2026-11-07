import { setMessages } from './t'

/**
 * The languages the app can be shown in. English is part of the app; the
 * others are loaded only when chosen (one small file each, see hi.ts and
 * es.ts). Names are written in the language itself, so they can always be
 * found, whatever language is on screen.
 */
export const LANGUAGES = ['en', 'hi', 'es'] as const
export type Language = (typeof LANGUAGES)[number]

export const LANGUAGE_NAMES: Record<Language, string> = {
  en: 'English',
  hi: 'हिन्दी',
  es: 'Español',
}

export const isLanguage = (value: unknown): value is Language =>
  LANGUAGES.includes(value as Language)

/** Texts that can come from a language file. */
type Messages = Record<string, string>

const LOADERS: Record<Exclude<Language, 'en'>, () => Promise<Messages>> = {
  hi: () => import('./hi').then((m) => m.hi),
  es: () => import('./es').then((m) => m.es),
}

/** The editor's own menus (BlockNote) have no Hindi; Spanish is built in. */
let editorDictionary: unknown

/** The editor's text for the chosen language (undefined = English). */
export const getEditorDictionary = (): unknown => editorDictionary

/**
 * Switches the app's texts to `language` (loading its file first). English
 * is always the fallback for any text a language file does not have.
 */
export async function applyLanguage(language: Language): Promise<void> {
  // English texts of later features load here, not in the first download
  // (the first-load size limit); other languages carry their own copies.
  const late = await import('./enO').then((m) => m.enO)
  if (language === 'en') {
    setMessages('en', late)
    editorDictionary = undefined
  } else {
    const messages = await LOADERS[language]()
    setMessages(language, { ...late, ...messages })
    editorDictionary =
      language === 'es'
        ? await import('@blocknote/core/locales').then((m) => m.es)
        : undefined
  }
  document.documentElement.lang = language
}
