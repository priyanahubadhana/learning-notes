import type { SettingDefinition } from '../registry'

/** One search result: the setting and how well it matched (lower = better). */
export interface SearchHit {
  definition: SettingDefinition
  score: number
}

/** The words a setting can be found by, already lower case. */
export interface SearchText {
  name: string
  help: string
  keywords: string
}

/**
 * SET-B05: finds settings by name, help text or plain-word keywords (for
 * example "ribbon"). Every word typed must be found somewhere. A name that
 * starts with the words ranks first, then a name that contains them, then the
 * help text, then keywords. Same score keeps the registry order.
 */
export function searchSettings(
  settings: readonly SettingDefinition[],
  query: string,
  textOf: (s: SettingDefinition) => SearchText,
): SearchHit[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean)
  if (words.length === 0) return []
  const hits: (SearchHit & { order: number })[] = []
  settings.forEach((definition, order) => {
    const { name, help, keywords } = textOf(definition)
    let score = 0
    for (const w of words) {
      const at = name.indexOf(w)
      const one =
        at === 0
          ? 0
          : at > 0
            ? 1
            : help.includes(w)
              ? 2
              : keywords.includes(w)
                ? 3
                : -1
      if (one < 0) return
      score = Math.max(score, one)
    }
    hits.push({ definition, score, order })
  })
  return hits
    .sort((a, b) => a.score - b.score || a.order - b.order)
    .map(({ definition, score }) => ({ definition, score }))
}
