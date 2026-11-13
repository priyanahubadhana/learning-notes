/** Spanish texts. A key missing here shows the English text. */
import { esAccounts } from './accounts'
import { esAi } from './ai'
import { esClaude } from './claude'
import { esCommon } from './common'
import { esDatabases } from './databases'
import { esEditor } from './editor'
import { esHelp } from './help'
import { esHistory } from './history'
import { esHome } from './home'
import { esHomeV2 } from './homeV2'
import { esImportExport } from './importExport'
import { esInk } from './ink'
import { esLibrary } from './library'
import { esLock } from './lock'
import { esMedia } from './media'
import { esPdf } from './pdf'
import { esReading } from './reading'
import { esRecall } from './recall'
import { esSearch } from './search'
import { esSettings } from './settings'
import { esSidebar } from './sidebar'
import { esSync } from './sync'
import { esTags } from './tags'
import { esToolbar } from './toolbar'
import { esUpdates } from './updates'
import { esUpdateV2 } from './updateV2'
import { esStorageSafety } from './storageSafety'
import { esLibraryV2 } from './libraryV2'
import { esFlags } from './flags'
import { esSlashMenu } from './slashMenu'
import { esShell } from './shell'
import { esAiBuild } from './aibuild'
import { esAiJobs } from './aijobs'
import { esReviewV2 } from './reviewV2'
import { esAiPlan } from './aiplan'
import { esParts } from './parts'
import { esNotebooksV2 } from './notebooksV2'
import { esSearchV2 } from './searchV2'
import { esPanelV2 } from './panelV2'
import { esV8Pen } from './v8Pen'

export const es: Record<string, string> = {
  ...esAccounts,
  ...esAi,
  ...esClaude,
  ...esCommon,
  ...esDatabases,
  ...esEditor,
  ...esHelp,
  ...esHistory,
  ...esHome,
  ...esHomeV2,
  ...esImportExport,
  ...esInk,
  ...esLibrary,
  ...esLock,
  ...esMedia,
  ...esPdf,
  ...esReading,
  ...esRecall,
  ...esSearch,
  ...esSettings,
  ...esSidebar,
  ...esSync,
  ...esTags,
  ...esToolbar,
  ...esUpdates,
  ...esUpdateV2,
  ...esFlags,
  ...esSlashMenu,
  ...esShell,
  ...esAiBuild,
  ...esAiJobs,
  ...esReviewV2,
  ...esAiPlan,
  ...esParts,
  ...esNotebooksV2,
  ...esSearchV2,
  ...esPanelV2,
  ...esLibraryV2,
  ...esV8Pen,
  ...esStorageSafety,
}
