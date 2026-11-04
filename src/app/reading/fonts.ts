/**
 * OpenDyslexic (SIL Open Font License 1.1, free to use and ship) is only
 * downloaded when someone picks it, so it adds nothing to the first load.
 * It is part of the app's files, so it works offline too.
 */
let loaded = false
export async function loadDyslexiaFont(): Promise<void> {
  if (loaded) return
  loaded = true
  try {
    await Promise.all([
      import('@fontsource/opendyslexic/latin-400.css'),
      import('@fontsource/opendyslexic/latin-700.css'),
    ])
  } catch {
    loaded = false // try again next time; the fallback font shows meanwhile
  }
}
