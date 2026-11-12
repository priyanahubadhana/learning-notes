import { t } from '../../i18n/t'
import { settingsRegistry } from '../builtinSettings'
import type { SettingDefinition } from '../registry'
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
  'pencil',
  'reading',
  'review',
  'journal',
  'advanced',
  'tryNew',
]

/**
 * Where rows live in the new screen when it differs from the registry's
 * category (spec decision 6). Only the place changes: the row, its stored
 * value and its id are the registry's. Pencil settings get their own section
 * and the two help-style tips move to Help & tour.
 */
export const MOVED: Record<string, string> = {
  'advanced.pencilWrites': 'pencil',
  'advanced.holdSelect': 'pencil',
  'advanced.holdMenu': 'pencil',
  'advanced.pencilTapTwice': 'pencil',
  'advanced.pencilScrolls': 'pencil',
  'advanced.smartGuides': 'pencil',
  'advanced.autoSwitch': 'pencil',
  'advanced.hoverTips': 'help',
  'advanced.shortcutHints': 'help',
}

/** Every section a row appears in: its home first, then "also in". */
export function sectionIdsOf(def: SettingDefinition): string[] {
  return [MOVED[def.id] ?? def.category, ...(def.alsoIn ?? [])]
}

/**
 * The sections of the new screen: the registry's categories in the mock's
 * order, plus Your experience (first, or last when moved), Help & tour and
 * Professional features. Nothing is removed from the registry.
 */
export function buildSections(
  experienceOnTop: boolean,
  tryNewOpen = false,
): V3Section[] {
  const cats = [...settingsRegistry.categories()]
    // "Try new features" stays hidden until it is asked for (SET-B26).
    .filter((c) => c.id !== 'tryNew' || tryNewOpen)
    .sort((a, b) => {
      const ia = ORDER.indexOf(a.id)
      const ib = ORDER.indexOf(b.id)
      return (ia < 0 ? 1000 + a.order : ia) - (ib < 0 ? 1000 + b.order : ib)
    })
  const rows: V3Section[] = cats.map((c) => ({
    id: c.id,
    // "Let Claude use my notes" is now "Let AI use my notebooks" (SET-B25).
    label: c.id === 'claude' ? tv('sv3.aiNotebooks.title') : t(c.labelKey),
    lead: c.descriptionKey ? t(c.descriptionKey) : undefined,
    empty: c.emptyKey ? t(c.emptyKey) : undefined,
    kind: 'rows',
  }))
  const pencil: V3Section = {
    id: 'pencil',
    label: tv('sv3.pencil.title'),
    lead: tv('sv3.pencil.lead'),
    kind: 'rows',
  }
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
  const pro: V3Section = {
    id: 'pro',
    label: tv('sv3.pro.title'),
    kind: 'pro',
  }
  const list = [...rows]
  list.splice(
    list.findIndex((s) => s.id === 'toolbar') + 1 || list.length,
    0,
    pencil,
  )
  return experienceOnTop
    ? [experience, ...list, help, pro]
    : [...list, help, pro, experience]
}

/** The name of a section (also for those the registry does not list). */
export const sectionLabel = (id: string): string =>
  buildSections(true).find((s) => s.id === id)?.label ?? id
