import type { ProFeatureId } from '../proFeatures.gen'

export interface ProGroup {
  /** Short key used for the group's texts (`sv3.group.<slug>`). */
  slug: string
  ids: ProFeatureId[]
}

/** The groups in the order of the spec; the build specs' extras come last. */
const ORDER: [group: string, slug: string][] = [
  ['Home', 'home'],
  ['Notebooks', 'notebooks'],
  ['Toolbar/Text/Pen', 'toolbar'],
  ['Reader', 'reader'],
  ['Library', 'library'],
  ['Review', 'review'],
  ['Search', 'search'],
  ['AI mode', 'ai'],
  ['Settings', 'settings'],
]
const MORE = 'more'

/** Groups every feature once: unknown group names fall into "More features". */
export function proGroups(
  features: readonly { id: ProFeatureId; group: string }[],
): ProGroup[] {
  const bySlug = new Map<string, ProFeatureId[]>()
  for (const f of features) {
    const slug = ORDER.find(([g]) => g === f.group)?.[1] ?? MORE
    bySlug.set(slug, [...(bySlug.get(slug) ?? []), f.id])
  }
  return [...ORDER.map(([, s]) => s), MORE]
    .filter((slug) => bySlug.has(slug))
    .map((slug) => ({ slug, ids: bySlug.get(slug)! }))
}
