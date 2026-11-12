/** Hindi texts. A key missing here shows the English text. */
import { hiAccounts } from './accounts'
import { hiAi } from './ai'
import { hiClaude } from './claude'
import { hiCommon } from './common'
import { hiDatabases } from './databases'
import { hiEditor } from './editor'
import { hiHelp } from './help'
import { hiHistory } from './history'
import { hiHome } from './home'
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
import { hiFlags } from './flags'
import { hiSlashMenu } from './slashMenu'
import { hiAiBuild } from './aibuild'
import { hiAiJobs } from './aijobs'
import { hiParts } from './parts'

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
  ...hiAiBuild,
  ...hiAiJobs,
  ...hiParts,
}
