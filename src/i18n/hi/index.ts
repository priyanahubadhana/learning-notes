/** Hindi texts. A key missing here shows the English text. */
import { hiReaderV2 } from './readerV2'
import { hiAccounts } from './accounts'
import { hiAi } from './ai'
import { hiClaude } from './claude'
import { hiCommon } from './common'
import { hiDatabases } from './databases'
import { hiEditor } from './editor'
import { hiHelp } from './help'
import { hiHistory } from './history'
import { hiHome } from './home'
import { hiHomeV2 } from './homeV2'
import { hiImportExport } from './importExport'
import { hiInk } from './ink'
import { hiLibrary } from './library'
import { hiLock } from './lock'
import { hiMedia } from './media'
import { hiPdf } from './pdf'
import { hiReading } from './reading'
import { hiRecall } from './recall'
import { hiSearch } from './search'
import { hiSettings } from './settings'
import { hiSidebar } from './sidebar'
import { hiSync } from './sync'
import { hiTags } from './tags'
import { hiToolbar } from './toolbar'
import { hiUpdates } from './updates'
import { hiUpdateV2 } from './updateV2'
import { hiLibraryV2 } from './libraryV2'
import { hiFlags } from './flags'
import { hiSlashMenu } from './slashMenu'
import { hiShell } from './shell'
import { hiAiBuild } from './aibuild'
import { hiAiJobs } from './aijobs'
import { hiReviewV2 } from './reviewV2'
import { hiAiPlan } from './aiplan'
import { hiParts } from './parts'
import { hiNotebooksV2 } from './notebooksV2'
import { hiSearchV2 } from './searchV2'
import { hiPanelV2 } from './panelV2'
import { hiV8Pen } from './v8Pen'

export const hi: Record<string, string> = {
  ...hiAccounts,
  ...hiAi,
  ...hiClaude,
  ...hiCommon,
  ...hiDatabases,
  ...hiEditor,
  ...hiHelp,
  ...hiHistory,
  ...hiHome,
  ...hiHomeV2,
  ...hiImportExport,
  ...hiInk,
  ...hiLibrary,
  ...hiLock,
  ...hiMedia,
  ...hiPdf,
  ...hiReading,
  ...hiRecall,
  ...hiSearch,
  ...hiSettings,
  ...hiSidebar,
  ...hiSync,
  ...hiTags,
  ...hiToolbar,
  ...hiUpdates,
  ...hiUpdateV2,
  ...hiFlags,
  ...hiSlashMenu,
  ...hiShell,
  ...hiAiBuild,
  ...hiReaderV2,
  ...hiAiJobs,
  ...hiReviewV2,
  ...hiAiPlan,
  ...hiParts,
  ...hiNotebooksV2,
  ...hiSearchV2,
  ...hiPanelV2,
  ...hiLibraryV2,
  ...hiV8Pen,
}
