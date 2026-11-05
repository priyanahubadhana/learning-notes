import { MAIN_TOOLS, type MainTool, type PillTool } from './mainTools'

/**
 * Moves a person's custom Write · Draw · Read lists (before redesign step 2)
 * to the new main bar and pills. Pure: `migrateLists` only decides; the app
 * applies the result once (see applyMigration in migrateApply.ts).
 */

export interface OldLists {
  write: readonly string[]
  draw: readonly string[]
  read: readonly string[]
}

export interface Migrated {
  main: MainTool[]
  pills: Partial<Record<PillTool, string[]>>
  extras: string[]
}

/** Old bar buttons that become options of the Text pill. */
const TEXT_OPTION: Record<string, readonly string[]> = {
  bold: ['bold'],
  italic: ['italic'],
  underline: ['underline'],
  color: ['textColor', 'highlightColor'],
  highlight: ['highlightColor'],
  bulletList: ['list'],
  numberedList: ['list'],
  checklist: ['list'],
  alignLeft: ['align'],
  alignCenter: ['align'],
  alignRight: ['align'],
  'mark:key': ['keyPoint'],
}

/** Old ids the main bar already has (or that have no use any more). */
const NOT_EXTRA = new Set([
  'undo',
  'redo',
  'more',
  'newLine',
  'picture',
  'drawColor',
  'thickness',
  'shapes',
  'textSize',
  'font',
  'theme',
  'find',
  'readAloud',
  'outline',
  'lineFocus',
  'hideBlanks',
  'lockReading',
  'exitReading',
  'ballPen',
  'fountainPen',
  'marker',
  'brush',
  'pencil',
])

const same = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && a.every((x, i) => x === b[i])

/**
 * Null = nothing was customised (use the new standard bar). Otherwise the
 * main bar keeps the ink tools the Draw set had, the Text pill keeps the
 * formatting buttons of the Write set in their order, and every other pinned
 * button stays reachable as an extra button.
 */
export function migrateLists(
  old: OldLists,
  defaults: OldLists,
): Migrated | null {
  if (
    same(old.write, defaults.write) &&
    same(old.draw, defaults.draw) &&
    same(old.read, defaults.read)
  ) {
    return null
  }
  const main = MAIN_TOOLS.filter((tool) => {
    if (
      tool === 'pen' ||
      tool === 'highlighter' ||
      tool === 'eraser' ||
      tool === 'lasso'
    ) {
      return old.draw.includes(tool)
    }
    if (tool === 'newLine') {
      return [old.write, old.draw, old.read].some((l) => l.includes('newLine'))
    }
    return true
  })
  const text: string[] = ['style']
  const extras: string[] = []
  for (const id of old.write) {
    const options = TEXT_OPTION[id]
    if (options) {
      for (const o of options) if (!text.includes(o)) text.push(o)
    } else if (
      !NOT_EXTRA.has(id) &&
      !extras.includes(id) &&
      extras.length < 8
    ) {
      extras.push(id)
    }
  }
  return { main, pills: { text }, extras }
}
