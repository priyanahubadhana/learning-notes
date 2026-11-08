import { db } from '../../core/db'
import { addToSummary } from '../../editor/addToSummary'
import { runTask } from '../errors'
import { t, type MessageKey } from '../../i18n/t'
import { markLabels, markName } from '../../revise/reviseMarks'
import {
  altShortcutLabel,
  isApple,
  shortcutLabel,
  shortcutShiftLabel,
} from '../keys'
import { runEditorCommand } from './editorCommands'
import type { IconName } from './icons'
import { currentRunner, type Runner } from './toolRuntime'
import { toggleRibbonBehaviour } from './toolbarState'
import { toggleToolBar } from './toolbarVisibility'
import {
  exitReading,
  openReader,
  openReadingPanel,
  toggleHideBlanks,
  toggleLineFocus,
  toggleLockToReading,
  toggleReadingMode,
} from '../reading/readingTools'
import type { TabId } from './tabs'
import { runInkTool } from '../../ink/inkTools'
import { toggleWritePad } from '../../editor/writePad/padState'
import { openHandwritingChooser } from './handwriting'
import {
  isAudioPanelOpen,
  setAudioPanel,
  toggleRecording,
} from '../../audio/audioActions'

/**
 * THE list of every feature the control panel, the ribbon and the short bar
 * know about. Adding a feature to the app = adding one line here (plus its
 * name in i18n/en.ts as `tool.<id>`). Settings are not listed here: the
 * control panel reads them from the settings registry.
 */

export { type TabId }
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
  /** Used again and again (New line, Undo): the ribbon keeps its tools open. */
  repeat?: boolean
  /** Runs it. Without `run`, the editor command with the same id runs. */
  run?: (r: Runner) => void
}

const mod = (key: string) => shortcutLabel(key)
const modShift = shortcutShiftLabel

/** Tools that open one of the short bar's trays need the bar. */
const needsBar = (r: Runner, panel: 'more' | 'color' | 'menu'): void => {
  if (r.bar) r.bar.openPanel(panel)
  else r.app?.toast(t('tool.needsBar'))
}

/** A Draw tool of the ink engine (ink/inkTools.ts). */
const draw = (
  id: string,
  icon: IconName,
  group: string,
  extra: Partial<ToolDef> = {},
): ToolDef => ({
  id,
  icon,
  section: 'draw',
  group,
  run: () => runInkTool(id),
  ...extra,
})

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
    run: (r) => r.app?.lockCurrent('page'),
  },
  {
    id: 'lockNotebook',
    icon: 'lock',
    section: 'file',
    group: 'protect',
    run: (r) => r.app?.lockCurrent('notebook'),
  },
  {
    id: 'lockSettings',
    icon: 'settings',
    section: 'file',
    group: 'protect',
    run: (r) => r.app?.openSettings('lock.idleMinutes'),
  },
  {
    id: 'settings',
    icon: 'settings',
    section: 'file',
    group: 'app',
    run: (r) => r.app?.openSettings(),
  },

  // ---- Home ----
  // One Copy & paste button at the end of Home holds the four copy and paste
  // extras (they stay in the control panel); normal copy and paste are the
  // keyboard and a long press.
  {
    id: 'copyPaste',
    icon: 'copy',
    section: 'home',
    group: 'copyPaste',
    run: (r) => needsBar(r, 'menu'),
  },
  {
    id: 'copyPlain',
    icon: 'copy',
    section: 'home',
    group: 'clipboard',
    inRibbon: false,
  },
  {
    id: 'copyMarkdown',
    icon: 'copy',
    section: 'home',
    group: 'clipboard',
    inRibbon: false,
  },
  {
    id: 'pastePlain',
    icon: 'paste',
    section: 'home',
    group: 'clipboard',
    inRibbon: false,
    shortcut: () => modShift('V'),
  },
  {
    id: 'copyPictures',
    icon: 'copy',
    section: 'home',
    group: 'clipboard',
    inRibbon: false,
  },
  {
    id: 'bold',
    icon: 'bold',
    section: 'home',
    group: 'marks',
    shortcut: () => mod('B'),
  },
  {
    id: 'italic',
    icon: 'italic',
    section: 'home',
    group: 'marks',
    shortcut: () => mod('I'),
  },
  {
    id: 'underline',
    icon: 'underline',
    section: 'home',
    group: 'marks',
    shortcut: () => mod('U'),
  },
  { id: 'strike', icon: 'strike', section: 'home', group: 'marks' },
  {
    id: 'code',
    icon: 'code',
    section: 'home',
    group: 'marks',
    shortcut: () => mod('E'),
  },
  {
    id: 'font',
    icon: 'font',
    section: 'home',
    group: 'fontSize',
    also: [{ tab: 'view', group: 'text' }],
    run: () => openReadingPanel('settings'),
  },
  {
    id: 'textSize',
    icon: 'textSize',
    section: 'home',
    group: 'fontSize',
    also: [{ tab: 'view', group: 'text' }],
    run: () => openReadingPanel('settings'),
  },
  {
    id: 'more',
    icon: 'more',
    section: 'home',
    group: 'moreFormat',
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
  { id: 'heading1', icon: 'heading1', section: 'home', group: 'textStyle' },
  { id: 'heading2', icon: 'heading2', section: 'home', group: 'textStyle' },
  { id: 'heading3', icon: 'heading3', section: 'home', group: 'textStyle' },
  { id: 'bulletList', icon: 'list', section: 'home', group: 'lists' },
  { id: 'numberedList', icon: 'numbered', section: 'home', group: 'lists' },
  { id: 'checklist', icon: 'checklist', section: 'home', group: 'lists' },
  { id: 'quote', icon: 'quote', section: 'home', group: 'textStyle' },
  { id: 'alignLeft', icon: 'alignLeft', section: 'home', group: 'lists' },
  {
    id: 'alignCenter',
    icon: 'alignCenter',
    section: 'home',
    group: 'lists',
  },
  { id: 'alignRight', icon: 'alignRight', section: 'home', group: 'lists' },
  {
    id: 'indent',
    icon: 'indent',
    section: 'home',
    group: 'lists',
    shortcut: () => 'Tab',
  },
  {
    id: 'outdent',
    icon: 'outdent',
    section: 'home',
    group: 'lists',
    shortcut: () => 'Shift+Tab',
  },
  {
    id: 'newLine',
    icon: 'newLine',
    section: 'home',
    group: 'lists',
    repeat: true,
  },
  { id: 'blank', icon: 'input', section: 'home', group: 'moreFormat' },
  {
    id: 'undo',
    icon: 'undo',
    repeat: true,
    section: 'home',
    group: 'undoRedo',
    shortcut: () => mod('Z'),
  },
  {
    id: 'redo',
    icon: 'redo',
    repeat: true,
    section: 'home',
    group: 'undoRedo',
    shortcut: () => modShift('Z'),
  },

  // ---- Insert ----
  { id: 'picture', icon: 'image', section: 'insert', group: 'media' },
  {
    id: 'writePad',
    icon: 'pencil',
    section: 'insert',
    group: 'media',
    run: (r) => {
      if (r.editor)
        toggleWritePad(r.editor, r.app?.currentPageId() ?? undefined)
      else r.app?.toast(t('tool.needsPage'))
    },
  },
  {
    id: 'handwriting',
    icon: 'penLine',
    section: 'insert',
    group: 'media',
    run: () => openHandwritingChooser(),
  },
  {
    id: 'audio',
    icon: 'music',
    section: 'insert',
    group: 'media',
    run: (r) =>
      void toggleRecording(r.app?.currentPageId() ?? null, (message) =>
        r.app?.toast(message),
      ),
  },
  {
    id: 'file',
    icon: 'filePlus',
    section: 'insert',
    group: 'media',
  },
  {
    id: 'camera',
    icon: 'camera',
    section: 'insert',
    group: 'media',
  },
  {
    id: 'table',
    icon: 'table',
    section: 'insert',
    group: 'blocks',
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
  },
  {
    id: 'toHome',
    icon: 'checklist',
    section: 'insert',
    group: 'study',
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
    run: (r) => {
      // With a page open: puts the selected lines (or the cursor's) into its
      // Summary; elsewhere it opens the notebook's Summary tab.
      const pageId = r.app?.currentPageId()
      if (r.editor && pageId && r.app) {
        const toast = r.app.toast
        runTask(addToSummary(r.editor, { db, pageId }).then((m) => toast(m)))
      } else r.app?.openNotebookTab('summary')
    },
  },

  // ---- Draw ----
  draw('ballPen', 'pen', 'pens'),
  draw('fountainPen', 'penTool', 'pens'),
  draw('marker', 'penLine', 'pens'),
  draw('brush', 'brush', 'pens'),
  draw('pencil', 'pencil', 'pens'),
  draw('pen', 'pen', 'pens', { inRibbon: false }),
  draw('highlighter', 'highlighter', 'tools'),
  draw('eraser', 'eraser', 'tools'),
  draw('lasso', 'lasso', 'tools'),
  draw('shapes', 'shapes', 'tools'),
  draw('tape', 'tape', 'tools'),
  draw('magnifier', 'zoom', 'tools'),
  draw('ruler', 'ruler', 'tools'),
  draw('drawColor', 'palette', 'style'),
  draw('thickness', 'minus', 'style'),
  draw('opacity', 'droplet', 'style'),
  draw('pressure', 'gauge', 'style'),
  draw('smoothing', 'waves', 'style'),
  draw('taperedEnds', 'penLine', 'style'),
  draw('paperBlank', 'square', 'paper'),
  draw('paperLined', 'list', 'paper'),
  draw('paperGrid', 'grid', 'paper'),
  draw('paperDots', 'grid', 'paper'),
  draw('onlyPencil', 'hand', 'pencilOnly'),
  draw('inkLayers', 'layers', 'tools'),

  // ---- View ----
  {
    id: 'readingMode',
    icon: 'bookOpen',
    section: 'view',
    group: 'read',
    run: () => toggleReadingMode(),
  },
  {
    id: 'readerFull',
    icon: 'maximize',
    section: 'view',
    group: 'read',
    run: () => openReader(),
  },
  {
    id: 'lineFocus',
    icon: 'focus',
    section: 'view',
    group: 'read',
    run: () => toggleLineFocus(),
  },
  {
    id: 'readAloud',
    icon: 'volume',
    section: 'view',
    group: 'read',
    run: () => openReadingPanel('aloud'),
  },
  {
    id: 'outline',
    icon: 'list',
    section: 'view',
    group: 'read',
    run: () => openReadingPanel('contents'),
  },
  {
    id: 'hideBlanks',
    icon: 'eyeOff',
    section: 'view',
    group: 'read',
    run: () => toggleHideBlanks(),
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
    run: () => toggleLockToReading(),
  },
  {
    id: 'exitReading',
    icon: 'close',
    section: 'view',
    group: 'read',
    run: () => exitReading(),
  },
  {
    id: 'audioPanel',
    icon: 'music',
    section: 'view',
    group: 'views',
    run: () => setAudioPanel(!isAudioPanelOpen()),
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
    run: () => openReadingPanel('settings'),
  },
  {
    id: 'shortBar',
    icon: 'panel',
    section: 'view',
    group: 'bar',
    // Turning it off asks first (and offers Undo).
    run: () => toggleToolBar(),
  },
  {
    id: 'keepToolsOpen',
    icon: 'pin',
    section: 'view',
    group: 'bar',
    shortcut: () => (isApple() ? '⌘F1' : 'Ctrl+F1'),
    run: () => void toggleRibbonBehaviour(),
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
  home: [
    'undoRedo',
    'textStyle',
    'fontSize',
    'marks',
    'colours',
    'lists',
    'moreFormat',
    'copyPaste',
  ],
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
