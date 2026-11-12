import type { IconName } from './icons'

/**
 * Extra facts about every tool (slice 0i): one entry per id in `TOOLS`
 * (toolRegistry.ts) and `MAIN_TOOLS` (main/mainTools.ts). Later screens (bar,
 * "/" menu, command palette, Settings, AI) read these instead of keeping their
 * own lists. Only types are imported here, so this file stays tiny; nothing
 * reads it yet. A test keeps its ids equal to the two lists.
 *
 * - `unlock`: the Professional switch id (docs/mockups/pro-features.md).
 * - Ids in both lists (pen, eraser …) use the main bar's icon.
 */
export type ToolLevel = 'beginner' | 'professional'
export type ToolPlace = 'toolbar' | 'slash' | 'palette' | 'settings'

export interface ToolMeta {
  level: ToolLevel
  /** Required when `level` is 'professional'. */
  unlock?: string
  places: readonly ToolPlace[]
  /** Can the person pin it as a favourite. */
  favourite: boolean
  icon: IconName
}

export const TOOL_META: Readonly<Record<string, ToolMeta>> = {
  saveRestore: {
    level: 'beginner',
    places: ['toolbar', 'palette'],
    favourite: false,
    icon: 'save',
  },
  share: {
    level: 'beginner',
    places: ['toolbar', 'palette'],
    favourite: true,
    icon: 'share',
  },
  print: {
    level: 'beginner',
    places: ['toolbar', 'palette'],
    favourite: true,
    icon: 'printer',
  },
  ankiImport: {
    level: 'beginner',
    places: ['palette', 'settings'],
    favourite: true,
    icon: 'import',
  },
  lockPage: {
    level: 'beginner',
    places: ['toolbar', 'palette'],
    favourite: true,
    icon: 'lock',
  },
  lockNotebook: {
    level: 'beginner',
    places: ['toolbar', 'palette'],
    favourite: true,
    icon: 'lock',
  },
  lockSettings: {
    level: 'professional',
    unlock: 'account.pinLock',
    places: ['palette', 'settings'],
    favourite: false,
    icon: 'settings',
  },
  settings: {
    level: 'beginner',
    places: ['palette', 'settings'],
    favourite: false,
    icon: 'settings',
  },
  copyPaste: {
    level: 'beginner',
    places: ['toolbar', 'palette'],
    favourite: true,
    icon: 'copy',
  },
  copyPlain: {
    level: 'beginner',
    places: ['toolbar', 'palette'],
    favourite: true,
    icon: 'copy',
  },
  copyMarkdown: {
    level: 'beginner',
    places: ['toolbar', 'palette'],
    favourite: true,
    icon: 'copy',
  },
  pastePlain: {
    level: 'beginner',
    places: ['toolbar', 'palette'],
    favourite: true,
    icon: 'paste',
  },
  copyPictures: {
    level: 'beginner',
    places: ['toolbar', 'palette'],
    favourite: true,
    icon: 'copy',
  },
  bold: {
    level: 'beginner',
    places: ['toolbar', 'slash', 'palette'],
    favourite: true,
    icon: 'bold',
  },
  italic: {
    level: 'beginner',
    places: ['toolbar', 'slash', 'palette'],
    favourite: true,
    icon: 'italic',
  },
  underline: {
    level: 'beginner',
    places: ['toolbar', 'slash', 'palette'],
    favourite: true,
    icon: 'underline',
  },
  code: {
    level: 'professional',
    unlock: 'tb.textMarks',
    places: ['toolbar', 'slash', 'palette'],
    favourite: true,
    icon: 'code',
  },
  font: {
    level: 'professional',
    unlock: 'tb.textFonts',
    places: ['toolbar', 'palette'],
    favourite: true,
    icon: 'font',
  },
  textSize: {
    level: 'professional',
    unlock: 'tb.textFonts',
    places: ['toolbar', 'palette'],
    favourite: true,
    icon: 'textSize',
  },
  more: {
    level: 'beginner',
    places: ['toolbar', 'palette'],
    favourite: false,
    icon: 'more',
  },
  color: {
    level: 'beginner',
    places: ['toolbar', 'palette'],
    favourite: true,
    icon: 'palette',
  },
  alignCenter: {
    level: 'beginner',
    places: ['toolbar', 'palette'],
    favourite: true,
    icon: 'alignCenter',
  },
  indent: {
    level: 'beginner',
    places: ['toolbar', 'palette'],
    favourite: true,
    icon: 'indent',
  },
  outdent: {
    level: 'beginner',
    places: ['toolbar', 'palette'],
    favourite: true,
    icon: 'outdent',
  },
  newLine: {
    level: 'beginner',
    places: ['toolbar', 'palette'],
    favourite: true,
    icon: 'newLine',
  },
  layout: {
    level: 'professional',
    unlock: 'tb.textBox',
    places: ['toolbar', 'palette'],
    favourite: true,
    icon: 'grid',
  },
  undo: {
    level: 'beginner',
    places: ['toolbar', 'palette'],
    favourite: true,
    icon: 'undo',
  },
  redo: {
    level: 'beginner',
    places: ['toolbar', 'palette'],
    favourite: true,
    icon: 'redo',
  },
  writePad: {
    level: 'professional',
    unlock: 'tb.insertMore',
    places: ['toolbar', 'palette'],
    favourite: true,
    icon: 'pencil',
  },
  lastTool: {
    level: 'beginner',
    places: ['toolbar', 'palette'],
    favourite: true,
    icon: 'swap',
  },
  handwriting: {
    level: 'professional',
    unlock: 'tb.insertMore',
    places: ['toolbar', 'palette'],
    favourite: true,
    icon: 'penLine',
  },
  audio: {
    level: 'professional',
    unlock: 'tb.insertMore',
    places: ['toolbar', 'slash', 'palette'],
    favourite: true,
    icon: 'music',
  },
  file: {
    level: 'professional',
    unlock: 'tb.insertMore',
    places: ['toolbar', 'slash', 'palette'],
    favourite: true,
    icon: 'filePlus',
  },
  camera: {
    level: 'beginner',
    places: ['toolbar', 'slash', 'palette'],
    favourite: true,
    icon: 'camera',
  },
  table: {
    level: 'beginner',
    places: ['toolbar', 'slash', 'palette'],
    favourite: true,
    icon: 'table',
  },
  link: {
    level: 'beginner',
    places: ['toolbar', 'slash', 'palette'],
    favourite: true,
    icon: 'link',
  },
  pageLink: {
    level: 'professional',
    unlock: 'tb.insertMore',
    places: ['toolbar', 'slash', 'palette'],
    favourite: true,
    icon: 'notebook',
  },
  insertTemplate: {
    level: 'professional',
    unlock: 'tb.insertMore',
    places: ['toolbar', 'slash', 'palette'],
    favourite: true,
    icon: 'template',
  },
  saveTemplate: {
    level: 'professional',
    unlock: 'tb.insertMore',
    places: ['toolbar', 'palette'],
    favourite: true,
    icon: 'template',
  },
  mindMap: {
    level: 'professional',
    unlock: 'tb.insertMore',
    places: ['toolbar', 'slash', 'palette'],
    favourite: true,
    icon: 'network',
  },
  toHome: {
    level: 'beginner',
    places: ['toolbar', 'palette'],
    favourite: false,
    icon: 'checklist',
  },
  card: {
    level: 'beginner',
    places: ['toolbar', 'slash', 'palette'],
    favourite: true,
    icon: 'cards',
  },
  summary: {
    level: 'beginner',
    places: ['toolbar', 'slash', 'palette'],
    favourite: true,
    icon: 'fileText',
  },
  ballPen: {
    level: 'beginner',
    places: ['toolbar', 'palette'],
    favourite: true,
    icon: 'pen',
  },
  fountainPen: {
    level: 'beginner',
    places: ['toolbar', 'palette'],
    favourite: true,
    icon: 'penTool',
  },
  marker: {
    level: 'beginner',
    places: ['toolbar', 'palette'],
    favourite: true,
    icon: 'penLine',
  },
  brush: {
    level: 'beginner',
    places: ['toolbar', 'palette'],
    favourite: true,
    icon: 'brush',
  },
  pencil: {
    level: 'beginner',
    places: ['toolbar', 'palette'],
    favourite: true,
    icon: 'pencil',
  },
  pen: {
    level: 'beginner',
    places: ['toolbar', 'palette'],
    favourite: true,
    icon: 'penTool',
  },
  highlighter: {
    level: 'beginner',
    places: ['toolbar', 'palette'],
    favourite: true,
    icon: 'highlighter',
  },
  eraser: {
    level: 'beginner',
    places: ['toolbar', 'palette'],
    favourite: true,
    icon: 'eraser',
  },
  lasso: {
    level: 'beginner',
    places: ['toolbar', 'palette'],
    favourite: true,
    icon: 'lasso',
  },
  shapes: {
    level: 'professional',
    unlock: 'tb.shapesAids',
    places: ['toolbar', 'palette'],
    favourite: true,
    icon: 'shapes',
  },
  tape: {
    level: 'professional',
    unlock: 'tb.shapesAids',
    places: ['toolbar', 'palette'],
    favourite: true,
    icon: 'tape',
  },
  magnifier: {
    level: 'professional',
    unlock: 'tb.shapesAids',
    places: ['toolbar', 'palette'],
    favourite: true,
    icon: 'zoom',
  },
  ruler: {
    level: 'professional',
    unlock: 'tb.shapesAids',
    places: ['toolbar', 'palette'],
    favourite: true,
    icon: 'ruler',
  },
  drawColor: {
    level: 'beginner',
    places: ['toolbar', 'palette'],
    favourite: true,
    icon: 'palette',
  },
  thickness: {
    level: 'professional',
    unlock: 'tb.penStroke',
    places: ['toolbar', 'palette'],
    favourite: true,
    icon: 'minus',
  },
  opacity: {
    level: 'beginner',
    places: ['toolbar', 'palette'],
    favourite: true,
    icon: 'droplet',
  },
  pressure: {
    level: 'professional',
    unlock: 'tb.penFeel',
    places: ['toolbar', 'palette'],
    favourite: true,
    icon: 'gauge',
  },
  smoothing: {
    level: 'professional',
    unlock: 'tb.penFeel',
    places: ['toolbar', 'palette'],
    favourite: true,
    icon: 'waves',
  },
  taperedEnds: {
    level: 'professional',
    unlock: 'tb.penFeel',
    places: ['toolbar', 'palette'],
    favourite: true,
    icon: 'penLine',
  },
  paperBlank: {
    level: 'professional',
    unlock: 'tb.layers',
    places: ['toolbar', 'palette'],
    favourite: true,
    icon: 'square',
  },
  paperLined: {
    level: 'professional',
    unlock: 'tb.layers',
    places: ['toolbar', 'palette'],
    favourite: true,
    icon: 'list',
  },
  paperGrid: {
    level: 'professional',
    unlock: 'tb.layers',
    places: ['toolbar', 'palette'],
    favourite: true,
    icon: 'grid',
  },
  paperDots: {
    level: 'professional',
    unlock: 'tb.layers',
    places: ['toolbar', 'palette'],
    favourite: true,
    icon: 'grid',
  },
  onlyPencil: {
    level: 'professional',
    unlock: 'tb.penAids',
    places: ['toolbar', 'palette'],
    favourite: true,
    icon: 'hand',
  },
  inkLayers: {
    level: 'professional',
    unlock: 'tb.layers',
    places: ['toolbar', 'palette'],
    favourite: true,
    icon: 'layers',
  },
  readingMode: {
    level: 'beginner',
    places: ['toolbar', 'palette'],
    favourite: true,
    icon: 'bookOpen',
  },
  readerFull: {
    level: 'professional',
    unlock: 'reader.fullScreen',
    places: ['toolbar', 'palette'],
    favourite: true,
    icon: 'maximize',
  },
  lineFocus: {
    level: 'professional',
    unlock: 'reader.lineFocus',
    places: ['toolbar', 'palette'],
    favourite: true,
    icon: 'focus',
  },
  readAloud: {
    level: 'professional',
    unlock: 'reader.aloudVoice',
    places: ['toolbar', 'palette'],
    favourite: true,
    icon: 'volume',
  },
  outline: {
    level: 'beginner',
    places: ['toolbar', 'palette'],
    favourite: true,
    icon: 'list',
  },
  hideBlanks: {
    level: 'professional',
    unlock: 'reader.hideBlanks',
    places: ['toolbar', 'palette'],
    favourite: true,
    icon: 'eyeOff',
  },
  find: {
    level: 'beginner',
    places: ['toolbar', 'slash', 'palette'],
    favourite: true,
    icon: 'search',
  },
  lockReading: {
    level: 'professional',
    unlock: 'reader.readLock',
    places: ['toolbar', 'palette'],
    favourite: false,
    icon: 'lock',
  },
  exitReading: {
    level: 'beginner',
    places: ['toolbar', 'palette'],
    favourite: false,
    icon: 'close',
  },
  audioPanel: {
    level: 'beginner',
    places: ['toolbar', 'palette'],
    favourite: true,
    icon: 'music',
  },
  databaseView: {
    level: 'professional',
    unlock: 'tb.insertMore',
    places: ['toolbar', 'slash', 'palette'],
    favourite: true,
    icon: 'layoutGrid',
  },
  theme: {
    level: 'beginner',
    places: ['palette', 'settings'],
    favourite: true,
    icon: 'theme',
  },
  zoom: {
    level: 'beginner',
    places: ['palette', 'settings'],
    favourite: true,
    icon: 'zoom',
  },
  shortBar: {
    level: 'beginner',
    places: ['palette', 'settings'],
    favourite: true,
    icon: 'panel',
  },
  keepToolsOpen: {
    level: 'beginner',
    places: ['palette', 'settings'],
    favourite: false,
    icon: 'pin',
  },
  studyNow: {
    level: 'beginner',
    places: ['toolbar', 'palette'],
    favourite: true,
    icon: 'cards',
  },
  dueToday: {
    level: 'beginner',
    places: ['toolbar', 'palette'],
    favourite: true,
    icon: 'clock',
  },
  allCards: {
    level: 'professional',
    unlock: 'rev.browse',
    places: ['toolbar', 'palette'],
    favourite: true,
    icon: 'archive',
  },
  cardStats: {
    level: 'professional',
    unlock: 'rev.stats',
    places: ['toolbar', 'palette'],
    favourite: true,
    icon: 'chart',
  },
  today: {
    level: 'beginner',
    places: ['toolbar', 'palette'],
    favourite: true,
    icon: 'sun',
  },
  search: {
    level: 'beginner',
    places: ['toolbar', 'palette'],
    favourite: true,
    icon: 'search',
  },
  calendar: {
    level: 'beginner',
    places: ['toolbar', 'palette'],
    favourite: true,
    icon: 'calendar',
  },
  favourite: {
    level: 'beginner',
    places: ['toolbar', 'palette'],
    favourite: true,
    icon: 'star',
  },
  sidebar: {
    level: 'beginner',
    places: ['palette', 'settings'],
    favourite: true,
    icon: 'notebook',
  },
  controlPanel: {
    level: 'professional',
    unlock: 'device.controlPanel',
    places: ['palette', 'settings'],
    favourite: false,
    icon: 'search',
  },
  devicePicker: {
    level: 'professional',
    unlock: 'device.picker',
    places: ['palette', 'settings'],
    favourite: false,
    icon: 'tablet',
  },
  text: {
    level: 'beginner',
    places: ['toolbar', 'palette'],
    favourite: true,
    icon: 'textSize',
  },
  backspace: {
    level: 'beginner',
    places: ['toolbar', 'palette'],
    favourite: true,
    icon: 'backspace',
  },
  insert: {
    level: 'beginner',
    places: ['toolbar', 'palette'],
    favourite: true,
    icon: 'layoutGrid',
  },
  read: {
    level: 'beginner',
    places: ['toolbar', 'palette'],
    favourite: true,
    icon: 'bookOpen',
  },
}

/** The tool's facts, or undefined (own keys only, never the prototype). */
export function metaOf(id: string): ToolMeta | undefined {
  return Object.hasOwn(TOOL_META, id) ? TOOL_META[id] : undefined
}

/** The tool's icon; an unknown id gets the neutral "more" icon, never a blank. */
export function iconOf(id: string): IconName {
  return metaOf(id)?.icon ?? 'more'
}
