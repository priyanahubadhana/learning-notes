import { t, type MessageKey } from '../../i18n/t'
import { markLabels, markName } from '../../revise/reviseMarks'
import { barPlacementSetting } from '../../settings/builtinSettings'
import {
  readDeviceSetting,
  writeDeviceSetting,
} from '../../settings/settingsService'
import {
  altShortcutLabel,
  isApple,
  shortcutLabel,
  shortcutShiftLabel,
} from '../keys'
import { runEditorCommand } from './editorCommands'
import type { IconName } from './icons'
import { currentRunner, type Runner } from './toolRuntime'
import { stayOpen } from './toolbarState'
import { TABS, type TabId } from './tabs'

/**
 * THE list of every feature the control panel, the ribbon and the short bar
 * know about. Adding a feature to the app = adding one line here (plus its
 * name in i18n/en.ts as `tool.<id>`). Settings are not listed here: the
 * control panel reads them from the settings registry.
 */

export { TABS, type TabId }
/** A ribbon tab, or "go": places to go to (not on the ribbon). */
export type Section = TabId | 'go'

/** Why a tool is not usable yet (its message is `tool.coming.<reason>`). */
export type ComingReason =
  'ink' | 'reading' | 'lock' | 'audio' | 'mindmap' | 'table' | 'file' | 'print'

export interface ToolPlace {
  tab: TabId
  group: string
}

export interface ToolDef {
  /** Stable id, saved with the bar. Never rename once released. */
  id: string
  icon: IconName
  section: Section
  /** Group name id (`ribbon.group.<group>`). */
  group: string
  /** Other ribbon places that show the same tool. */
  also?: readonly ToolPlace[]
  /** False = not drawn on the ribbon (still in the panel and Edit bar). */
  inRibbon?: boolean
  shortcut?: () => string | undefined
  coming?: ComingReason
  /** Runs it. Without `run`, the editor command with the same id runs. */
  run?: (r: Runner) => void
}

const mod = (key: string) => shortcutLabel(key)
const modShift = shortcutShiftLabel

/** Tools that open one of the short bar's trays need the bar. */
const needsBar = (r: Runner, panel: 'more' | 'color'): void => {
  if (r.bar) r.bar.openPanel(panel)
  else r.app?.toast(t('tool.needsBar'))
}

const ink = (
  id: string,
  icon: IconName,
  group: string,
  extra: Partial<ToolDef> = {},
): ToolDef => ({ id, icon, section: 'draw', group, coming: 'ink', ...extra })

export const TOOLS: readonly ToolDef[] = [
  // ---- File ----
  {
    id: 'saveRestore',
    icon: 'save',
    section: 'file',
    group: 'saveRestore',
    run: (r) => r.app?.openData(),
  },
  {
    id: 'share',
    icon: 'share',
    section: 'file',
    group: 'share',
    run: (r) => r.app?.openData(),
  },
  {
    id: 'print',
    icon: 'printer',
    section: 'file',
    group: 'share',
    coming: 'print',
  },
  {
    id: 'ankiImport',
    icon: 'import',
    section: 'file',
    group: 'import',
    run: (r) => r.app?.openData(),
  },
  {
    id: 'lockPage',
    icon: 'lock',
    section: 'file',
    group: 'protect',
    coming: 'lock',
  },
  {
    id: 'lockNotebook',
    icon: 'lock',
    section: 'file',
    group: 'protect',
    coming: 'lock',
  },
  {
    id: 'settings',
    icon: 'settings',
    section: 'file',
    group: 'app',
    run: (r) => r.app?.openSettings(),
  },

  // ---- Home ----
  { id: 'copyPlain', icon: 'copy', section: 'home', group: 'clipboard' },
  { id: 'copyMarkdown', icon: 'copy', section: 'home', group: 'clipboard' },
  {
    id: 'pastePlain',
    icon: 'paste',
    section: 'home',
    group: 'clipboard',
    shortcut: () => modShift('V'),
  },
  { id: 'copyPictures', icon: 'copy', section: 'home', group: 'clipboard' },
  {
    id: 'bold',
    icon: 'bold',
    section: 'home',
    group: 'text',
    shortcut: () => mod('B'),
  },
  {
    id: 'italic',
    icon: 'italic',
    section: 'home',
    group: 'text',
    shortcut: () => mod('I'),
  },
  {
    id: 'underline',
    icon: 'underline',
    section: 'home',
    group: 'text',
    shortcut: () => mod('U'),
  },
  { id: 'strike', icon: 'strike', section: 'home', group: 'text' },
  {
    id: 'code',
    icon: 'code',
    section: 'home',
    group: 'text',
    shortcut: () => mod('E'),
  },
  {
    id: 'font',
    icon: 'font',
    section: 'home',
    group: 'text',
    also: [{ tab: 'view', group: 'text' }],
    coming: 'reading',
  },
  {
    id: 'textSize',
    icon: 'textSize',
    section: 'home',
    group: 'text',
    also: [{ tab: 'view', group: 'text' }],
    coming: 'reading',
  },
  {
    id: 'more',
    icon: 'more',
    section: 'home',
    group: 'text',
    run: (r) => needsBar(r, 'more'),
  },
  {
    id: 'color',
    icon: 'palette',
    section: 'home',
    group: 'colours',
    run: (r) => needsBar(r, 'color'),
  },
  { id: 'highlight', icon: 'highlighter', section: 'home', group: 'colours' },
  { id: 'heading1', icon: 'heading1', section: 'home', group: 'paragraph' },
  { id: 'heading2', icon: 'heading2', section: 'home', group: 'paragraph' },
  { id: 'heading3', icon: 'heading3', section: 'home', group: 'paragraph' },
  { id: 'bulletList', icon: 'list', section: 'home', group: 'paragraph' },
  { id: 'numberedList', icon: 'numbered', section: 'home', group: 'paragraph' },
  { id: 'checklist', icon: 'checklist', section: 'home', group: 'paragraph' },
  { id: 'quote', icon: 'quote', section: 'home', group: 'paragraph' },
  { id: 'alignLeft', icon: 'alignLeft', section: 'home', group: 'paragraph' },
  {
    id: 'alignCenter',
    icon: 'alignCenter',
    section: 'home',
    group: 'paragraph',
  },
  { id: 'alignRight', icon: 'alignRight', section: 'home', group: 'paragraph' },
  {
    id: 'indent',
    icon: 'indent',
    section: 'home',
    group: 'paragraph',
    shortcut: () => 'Tab',
  },
  {
    id: 'outdent',
    icon: 'outdent',
    section: 'home',
    group: 'paragraph',
    shortcut: () => 'Shift+Tab',
  },
  { id: 'newLine', icon: 'newLine', section: 'home', group: 'paragraph' },
  { id: 'blank', icon: 'input', section: 'home', group: 'study' },
  {
    id: 'undo',
    icon: 'undo',
    section: 'home',
    group: 'undoRedo',
    shortcut: () => mod('Z'),
  },
  {
    id: 'redo',
    icon: 'redo',
    section: 'home',
    group: 'undoRedo',
    shortcut: () => modShift('Z'),
  },

  // ---- Insert ----
  { id: 'picture', icon: 'image', section: 'insert', group: 'media' },
  {
    id: 'audio',
    icon: 'music',
    section: 'insert',
    group: 'media',
    coming: 'audio',
  },
  {
    id: 'file',
    icon: 'filePlus',
    section: 'insert',
    group: 'media',
    coming: 'file',
  },
  {
    id: 'table',
    icon: 'table',
    section: 'insert',
    group: 'blocks',
    coming: 'table',
  },
  { id: 'database', icon: 'database', section: 'insert', group: 'blocks' },
  { id: 'callout', icon: 'sparkles', section: 'insert', group: 'blocks' },
  { id: 'divider', icon: 'minus', section: 'insert', group: 'blocks' },
  {
    id: 'link',
    icon: 'link',
    section: 'insert',
    group: 'blocks',
    run: (r) => needsBar(r, 'more'),
  },
  {
    id: 'pageLink',
    icon: 'notebook',
    section: 'insert',
    group: 'blocks',
    shortcut: () => '[[',
  },
  {
    id: 'insertTemplate',
    icon: 'template',
    section: 'insert',
    group: 'templates',
  },
  {
    id: 'saveTemplate',
    icon: 'template',
    section: 'insert',
    group: 'templates',
  },
  {
    id: 'mindMap',
    icon: 'network',
    section: 'insert',
    group: 'visual',
    coming: 'mindmap',
  },
  {
    id: 'card',
    icon: 'cards',
    section: 'insert',
    group: 'study',
    also: [{ tab: 'review', group: 'cards' }],
  },
  {
    id: 'summary',
    icon: 'fileText',
    section: 'insert',
    group: 'study',
    also: [{ tab: 'review', group: 'summary' }],
    run: (r) => r.app?.openNotebookTab('revise'),
  },

  // ---- Draw (all wait for the drawing update) ----
  ink('ballPen', 'pen', 'pens'),
  ink('fountainPen', 'penTool', 'pens'),
  ink('marker', 'penLine', 'pens'),
  ink('brush', 'brush', 'pens'),
  ink('pencil', 'pencil', 'pens'),
  ink('pen', 'pen', 'pens', { inRibbon: false }),
  ink('highlighter', 'highlighter', 'tools'),
  ink('eraser', 'eraser', 'tools'),
  ink('lasso', 'lasso', 'tools'),
  ink('shapes', 'shapes', 'tools'),
  ink('drawColor', 'palette', 'style'),
  ink('thickness', 'minus', 'style'),
  ink('opacity', 'droplet', 'style'),
  ink('pressure', 'gauge', 'style'),
  ink('smoothing', 'waves', 'style'),
  ink('taperedEnds', 'penLine', 'style'),
  ink('paperBlank', 'square', 'paper'),
  ink('paperLined', 'list', 'paper'),
  ink('paperGrid', 'grid', 'paper'),
  ink('paperDots', 'grid', 'paper'),
  ink('onlyPencil', 'hand', 'pencilOnly'),

  // ---- View ----
  {
    id: 'readingMode',
    icon: 'bookOpen',
    section: 'view',
    group: 'read',
    coming: 'reading',
  },
  {
    id: 'lineFocus',
    icon: 'focus',
    section: 'view',
    group: 'read',
    coming: 'reading',
  },
  {
    id: 'readAloud',
    icon: 'volume',
    section: 'view',
    group: 'read',
    coming: 'reading',
  },
  {
    id: 'find',
    icon: 'search',
    section: 'view',
    group: 'read',
    run: (r) => r.app?.openSearch(),
  },
  {
    id: 'lockReading',
    icon: 'lock',
    section: 'view',
    group: 'read',
    coming: 'lock',
  },
  {
    id: 'exitReading',
    icon: 'close',
    section: 'view',
    group: 'read',
    coming: 'reading',
  },
  {
    id: 'databaseView',
    icon: 'layoutGrid',
    section: 'view',
    group: 'views',
    run: (r) => r.app?.openDatabases(),
  },
  {
    id: 'theme',
    icon: 'theme',
    section: 'view',
    group: 'look',
    run: (r) => r.app?.cycleTheme(),
  },
  {
    id: 'zoom',
    icon: 'zoom',
    section: 'view',
    group: 'look',
    coming: 'reading',
  },
  {
    id: 'shortBar',
    icon: 'panel',
    section: 'view',
    group: 'bar',
    run: () =>
      writeDeviceSetting(
        barPlacementSetting,
        readDeviceSetting(barPlacementSetting) === 'floating'
          ? 'top'
          : 'floating',
      ),
  },
  {
    id: 'keepToolsOpen',
    icon: 'pin',
    section: 'view',
    group: 'bar',
    shortcut: () => (isApple() ? '⌘F1' : 'Ctrl+F1'),
    run: () => stayOpen.set(!stayOpen.get()),
  },

  // ---- Review ----
  {
    id: 'studyNow',
    icon: 'cards',
    section: 'review',
    group: 'cards',
    shortcut: () => altShortcutLabel('R'),
    run: (r) => r.app?.openReview(r.app.currentPageId() ? 'page' : 'all'),
  },
  {
    id: 'dueToday',
    icon: 'clock',
    section: 'review',
    group: 'cards',
    run: (r) => r.app?.openReview('all'),
  },
  {
    id: 'allCards',
    icon: 'archive',
    section: 'review',
    group: 'cards',
    also: [{ tab: 'view', group: 'views' }],
    run: (r) => r.app?.openAllCards(),
  },
  {
    id: 'cardStats',
    icon: 'chart',
    section: 'review',
    group: 'stats',
    run: (r) => r.app?.openNotebookTab('database'),
  },

  // ---- Go to (not on the ribbon) ----
  {
    id: 'today',
    icon: 'sun',
    section: 'go',
    group: 'go',
    shortcut: () => altShortcutLabel('T'),
    run: (r) => r.app?.openToday(),
  },
  {
    id: 'search',
    icon: 'search',
    section: 'go',
    group: 'go',
    shortcut: () => mod('K'),
    run: (r) => r.app?.openSearch(),
  },
  {
    id: 'calendar',
    icon: 'calendar',
    section: 'go',
    group: 'go',
    also: [{ tab: 'view', group: 'views' }],
    run: (r) => r.app?.openCalendar(),
  },
  {
    id: 'favourite',
    icon: 'star',
    section: 'go',
    group: 'go',
    run: (r) => r.app?.toggleFavourite(),
  },
  {
    id: 'sidebar',
    icon: 'notebook',
    section: 'go',
    group: 'go',
    shortcut: () => mod('\\'),
    run: (r) => r.app?.showSidebar(),
  },
  {
    id: 'controlPanel',
    icon: 'search',
    section: 'go',
    group: 'go',
    shortcut: () => modShift('K'),
    run: (r) => r.app?.openControlPanel(),
  },
  {
    id: 'devicePicker',
    icon: 'tablet',
    section: 'go',
    group: 'go',
    run: (r) => r.app?.openDevicePicker(),
  },
]

const BY_ID = new Map(TOOLS.map((tool) => [tool.id, tool]))

/** Revise marks (Key point, Keyword …) are tools too, whatever their names. */
function markTools(): ToolDef[] {
  return markLabels().map((label) => ({
    id: `mark:${label.id}`,
    icon: 'highlighter' as const,
    section: 'home' as const,
    group: 'study',
  }))
}

/** Every tool: the fixed list, then the Revise marks of this notebook. */
export const allTools = (): ToolDef[] => [...TOOLS, ...markTools()]

export function findTool(id: string): ToolDef | undefined {
  const fixed = BY_ID.get(id)
  if (fixed) return fixed
  return id.startsWith('mark:')
    ? markTools().find((tool) => tool.id === id)
    : undefined
}

export const isToolId = (id: string): boolean => findTool(id) !== undefined

/** The tool's name in the chosen language. */
export const toolLabel = (tool: ToolDef): string =>
  tool.id.startsWith('mark:')
    ? markName(tool.id.slice(5))
    : t(`tool.${tool.id}` as MessageKey)

export const tabLabel = (tab: Section): string =>
  t(`ribbon.tab.${tab}` as MessageKey)
export const groupLabel = (group: string): string =>
  t(`ribbon.group.${group}` as MessageKey)
export const comingText = (reason: ComingReason): string =>
  t(`tool.coming.${reason}` as MessageKey)

/** Where a tool lives, as words: "Home › Clipboard". */
export const whereText = (tool: ToolDef): string =>
  tool.section === 'go'
    ? t('panel.where.go')
    : `${tabLabel(tool.section)} › ${groupLabel(tool.group)}`

/** The order of the groups on each ribbon tab. */
export const TAB_GROUPS: Record<TabId, readonly string[]> = {
  file: ['saveRestore', 'share', 'import', 'protect', 'app'],
  home: ['clipboard', 'text', 'colours', 'paragraph', 'study', 'undoRedo'],
  insert: ['media', 'blocks', 'templates', 'visual', 'study'],
  draw: ['pens', 'tools', 'style', 'paper', 'pencilOnly'],
  view: ['read', 'views', 'text', 'look', 'bar'],
  review: ['cards', 'summary', 'stats'],
}

/** The tools of one ribbon group (including the ones that also show there). */
export function ribbonGroup(tab: TabId, group: string): ToolDef[] {
  return allTools().filter(
    (tool) =>
      tool.inRibbon !== false &&
      ((tool.section === tab && tool.group === group) ||
        tool.also?.some((place) => place.tab === tab && place.group === group)),
  )
}

/** Runs a tool by id (what a button, a panel row or a shortcut does). */
export function runTool(id: string): void {
  const tool = findTool(id)
  const r = currentRunner()
  if (!tool) return
  if (tool.coming) {
    r.app?.toast(comingText(tool.coming))
    return
  }
  if (tool.run) {
    tool.run(r)
    return
  }
  if (!r.editor) {
    r.app?.toast(t('tool.needsPage'))
    return
  }
  runEditorCommand(id, { editor: r.editor, extras: r.extras, app: r.app })
}
