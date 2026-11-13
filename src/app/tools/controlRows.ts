import { en } from '../../i18n/en'
import { t } from '../../i18n/t'
import { settingsRegistry } from '../../settings/builtinSettings'
import '../../settings/toolbarSettings'
import '../../settings/spaceSettings'
import '../../settings/labSettings'
import '../../settings/readingSettings'
import '../../settings/lockSettings'
import '../../settings/accountSettings'
import { getAppActions } from './toolRuntime'
import type { IconName } from './icons'
import { shownByFlags } from '../../settings/flagGate'
import {
  allTools,
  comingText,
  toolLabel,
  whereText,
  runTool,
  type Section,
} from './toolRegistry'

/** Rows of the control panel: every tool and every setting. */
export type Group = Section | 'settings'

export interface Row {
  key: string
  group: Group
  label: string
  where: string
  shortcut?: string
  icon: IconName
  /** Why it cannot run yet (shown dimmed). */
  coming?: string
  /** Text searched: the name, where it lives, and the English name too. */
  haystack: string
  /** The tool id a "Pin to bar" would add (settings cannot be pinned). */
  pinId?: string
  run: () => void
}

const englishName = (key: string): string =>
  (en as Record<string, string>)[key] ?? ''

/** All rows: the tools, then the settings (labels follow the language). */
export function buildRows(): Row[] {
  const rows: Row[] = allTools().map((tool) => {
    const label = toolLabel(tool)
    const where = whereText(tool)
    return {
      key: `tool:${tool.id}`,
      group: tool.section,
      label,
      where,
      shortcut: tool.shortcut?.(),
      icon: tool.icon,
      coming: tool.coming ? comingText(tool.coming) : undefined,
      haystack:
        `${label} ${where} ${englishName(`tool.${tool.id}`)}`.toLowerCase(),
      pinId: tool.id,
      run: () => runTool(tool.id),
    }
  })
  for (const setting of settingsRegistry.list()) {
    if (!shownByFlags(setting.id)) continue
    const category = settingsRegistry
      .categories()
      .find((c) => c.id === setting.category)
    const label = t(setting.labelKey)
    const where = `${t('settings.title')} › ${category ? t(category.labelKey) : ''}`
    rows.push({
      key: `setting:${setting.id}`,
      group: 'settings',
      label,
      where,
      icon: 'settings',
      haystack:
        `${label} ${t(setting.descriptionKey)} ${where} ${englishName(setting.labelKey)} ${setting.keywords ?? ''}`.toLowerCase(),
      run: () => getAppActions()?.openSettings(setting.id),
    })
  }
  return rows
}

/** True if every word typed is somewhere in the row's text. */
export const rowMatches = (haystack: string, query: string): boolean =>
  query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => haystack.includes(word))
