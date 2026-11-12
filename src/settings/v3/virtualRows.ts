import { rowShown } from './experience'
import { tv } from './tv'

/**
 * Rows that only the new screen has (they are not registry settings). They
 * are found by search like any row: `section` opens and the row glows.
 */
export interface VirtualRow {
  id: string
  section: string
  name: string
  help: string
  keywords: string
}

export function virtualRows(): VirtualRow[] {
  return [
    {
      id: 'general.pageTabs',
      section: 'general',
      name: tv('sv3.pageTabs.name'),
      help: tv('sv3.pageTabs.help'),
      keywords: 'tabs page tab row summary cards add rename reorder',
    },
    {
      id: 'help.experience',
      section: 'experience',
      name: tv('sv3.experience.title'),
      help: tv('sv3.experience.lead'),
      keywords: 'new beginner used experienced level essentials',
    },
    {
      id: 'pro.features',
      section: 'pro',
      name: tv('sv3.pro.title'),
      help: tv('sv3.pro.lead'),
      keywords: 'professional features switch unlock beginner',
    },
    {
      id: 'claude.section',
      section: 'claude',
      name: tv('sv3.aiNotebooks.title'),
      help: tv('sv3.aiNotebooks.help'),
      keywords: 'let claude use my notes claude connected ai api connector mcp',
    },
    {
      id: 'help.tours',
      section: 'help',
      name: tv('sv3.tours.title'),
      help: tv('sv3.tours.lead'),
      keywords: 'tour guide replay download walkthrough',
    },
    {
      id: 'help.firstLaunch',
      section: 'help',
      name: tv('sv3.firstLaunch.name'),
      help: tv('sv3.firstLaunch.help'),
      keywords: 'welcome first launch question again',
    },
  ].filter((r) => rowShown(r.id))
}

/** Virtual rows that match every word typed (name, help or keywords). */
export function searchVirtual(rows: VirtualRow[], query: string): VirtualRow[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean)
  if (words.length === 0) return []
  return rows.filter((r) => {
    const text = `${r.name} ${r.help} ${r.keywords}`.toLowerCase()
    return words.every((w) => text.includes(w))
  })
}
