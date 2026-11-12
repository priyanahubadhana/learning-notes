import type { AiToolDef } from './types'
import { cardsMakeCloze } from './tools/cardsMakeCloze'
import { cardsMakeRecall } from './tools/cardsMakeRecall'
import { mindmapsAdd } from './tools/mindmapsAdd'
import { mindmapsSetTheme } from './tools/mindmapsSetTheme'
import { cardsSuspend } from './tools/cardsSuspend'
import { databasesRename } from './tools/databasesRename'
import { stylesSetPaper } from './tools/stylesSetPaper'
import { layoutsSetPathStyle } from './tools/layoutsSetPathStyle'
import { databasesCreate } from './tools/databasesCreate'
import { notebooksCreate } from './tools/notebooksCreate'
import { notebooksCreateFromSpec } from './tools/notebooksCreateFromSpec'
import { pagesRefine } from './tools/pagesRefine'
import { pagesRename } from './tools/pagesRename'
import { pagesWriteNotes } from './tools/pagesWriteNotes'
import { stylesApply } from './tools/stylesApply'
import { summariesSet } from './tools/summariesSet'
import { tabsRename } from './tools/tabsRename'
import { tabsSetHidden } from './tools/tabsSetHidden'

/**
 * Every AI tool, in catalog order. Slice 0 holds the six existing connector
 * write tools (add_cards is two tools). Nothing reads this yet.
 */
export const AI_TOOLS: readonly AiToolDef[] = [
  notebooksCreate,
  notebooksCreateFromSpec,
  pagesWriteNotes,
  cardsMakeRecall,
  cardsMakeCloze,
  databasesCreate,
  stylesApply,
  pagesRefine,
  pagesRename,
  tabsRename,
  tabsSetHidden,
  summariesSet,
  mindmapsAdd,
  mindmapsSetTheme,
  cardsSuspend,
  databasesRename,
  stylesSetPaper,
  layoutsSetPathStyle,
]

export const AI_TOOLS_BY_ID: ReadonlyMap<string, AiToolDef> = new Map(
  AI_TOOLS.map((tool) => [tool.id, tool]),
)
