import { t } from '../../i18n/t'
import { settingsRegistry } from '../builtinSettings'
import { tv } from './tv'

/** What a section shows: registry rows, or one of the screens only v3 has. */
export type SectionKind = 'rows' | 'experience' | 'help' | 'pro'

export interface V3Section {
  id: string
  label: string
  lead?: string
  empty?: string
  kind: SectionKind
}

/** The order of the mock: Account, Sync and Lock follow General. */
const ORDER = [
  'general',
  'account',
  'sync',
  'lock',
  'ai',
  'apis',
  'permissions',
  'claude',
  'toolbar',
  'reading',
  'review',
  'journal',
  'advanced',
  'tryNew',
]

/**
 * The sections of the new screen: the registry's categories in the mock's
 * order, plus Your experience (first, or last when moved), Help & tour and
 * Professional features. Nothing is removed from the registry.
 */
export function buildSections(experienceOnTop: boolean): V3Section[] {
  const cats = [...settingsRegistry.categories()].sort((a, b) => {
    const ia = ORDER.indexOf(a.id)
    const ib = ORDER.indexOf(b.id)
    return (ia < 0 ? 1000 + a.order : ia) - (ib < 0 ? 1000 + b.order : ib)
  })
  const rows: V3Section[] = cats.map((c) => ({
    id: c.id,
    label: t(c.labelKey),
    lead: c.descriptionKey ? t(c.descriptionKey) : undefined,
    empty: c.emptyKey ? t(c.emptyKey) : undefined,
    kind: 'rows',
  }))
  const experience: V3Section = {
    id: 'experience',
    label: tv('sv3.experience.title'),
    kind: 'experience',
  }
  const help: V3Section = {
    id: 'help',
    label: tv('sv3.help.title'),
    lead: tv('sv3.help.lead'),
    kind: 'help',
  }
  return experienceOnTop
    ? [experience, ...rows, help]
    : [...rows, help, experience]
}
