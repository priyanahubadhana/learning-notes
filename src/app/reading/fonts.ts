import { db } from '../../core/db'
import { listFonts } from '../../core/fontService'
import {
  customFamily,
  isCustomFont,
  type BuiltInFont,
  type CustomFont,
  type ReadingFont,
} from './readingPrefs'

/**
 * Loads the file(s) of a font, only when it is picked or previewed, so the
 * fonts add nothing to the first load. All built-in fonts are Open Font
 * Licence 1.1 (licence texts in public/licenses/) and part of the app's
 * files, so they work offline too. Latin plus Devanagari where the font has
 * it (Kalam). Imported fonts come from the device's own database.
 */
const LOADERS: Record<
  Exclude<BuiltInFont, 'serif' | 'sans'>,
  () => Promise<unknown>[]
> = {
  dyslexia: () => [
    import('@fontsource/opendyslexic/latin-400.css'),
    import('@fontsource/opendyslexic/latin-700.css'),
  ],
  literata: () => [
    import('@fontsource/literata/latin-400.css'),
    import('@fontsource/literata/latin-700.css'),
  ],
  sourceSerif: () => [
    import('@fontsource/source-serif-4/latin-400.css'),
    import('@fontsource/source-serif-4/latin-700.css'),
  ],
  atkinson: () => [
    import('@fontsource/atkinson-hyperlegible-next/latin-400.css'),
    import('@fontsource/atkinson-hyperlegible-next/latin-700.css'),
  ],
  lexend: () => [
    import('@fontsource/lexend/latin-400.css'),
    import('@fontsource/lexend/latin-700.css'),
  ],
  caveat: () => [
    import('@fontsource/caveat/latin-400.css'),
    import('@fontsource/caveat/latin-700.css'),
  ],
  kalam: () => [
    import('@fontsource/kalam/latin-300.css'),
    import('@fontsource/kalam/devanagari-300.css'),
    import('@fontsource/kalam/latin-400.css'),
    import('@fontsource/kalam/latin-700.css'),
    import('@fontsource/kalam/devanagari-400.css'),
    import('@fontsource/kalam/devanagari-700.css'),
  ],
  patrick: () => [import('@fontsource/patrick-hand/latin-400.css')],
  shantell: () => [
    import('@fontsource/shantell-sans/latin-400.css'),
    import('@fontsource/shantell-sans/latin-700.css'),
  ],
}

const done = new Set<string>()

async function registerCustom(font: CustomFont): Promise<void> {
  const id = font.slice(7)
  const stored = (await listFonts(db)).find((f) => f.id === id)
  if (!stored) return
  const face = new FontFace(customFamily(font), stored.data)
  await face.load()
  document.fonts.add(face)
}

/** Makes sure the font is available (a no-op for fonts already loaded). */
export async function ensureFont(font: ReadingFont | 'default'): Promise<void> {
  if (font === 'app' || font === 'default' || font === 'serif') return
  if (font === 'sans' || done.has(font)) return
  done.add(font)
  try {
    if (isCustomFont(font)) await registerCustom(font)
    else await Promise.all(LOADERS[font]())
  } catch {
    done.delete(font) // try again next time; the fallback font shows meanwhile
  }
}

/** Forgets an imported font (after it was removed). */
export function forgetFont(font: CustomFont): void {
  done.delete(font)
}
