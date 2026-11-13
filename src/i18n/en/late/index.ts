/** English texts that load after the first screen (kept out of the first download). */
import { enLateAccounts } from './accounts'
import { enLateAi } from './ai'
import { enLateClaude } from './claude'
import { enLateCommon } from './common'
import { enLateDatabases } from './databases'
import { enLateHelp } from './help'
import { enLateHistory } from './history'
import { enLateHome } from './home'
import { enLateHomeV2 } from './homeV2'
import { enLateImportExport } from './importExport'
import { enLateInk } from './ink'
import { enLateLibrary } from './library'
import { enLateLibraryV2 } from './libraryV2'
import { enLateLock } from './lock'
import { enLateMedia } from './media'
import { enLateReading } from './reading'
import { enLateRecall } from './recall'
import { enLateSearch } from './search'
import { enLateSettings } from './settings'
import { enLateSidebar } from './sidebar'
import { enLateSync } from './sync'
import { enLateToolbar } from './toolbar'
import { enLateUpdates } from './updates'
import { enLateUpdateV2 } from './updateV2'
import { enLateFlags } from './flags'
import { enLateSlashMenu } from './slashMenu'
import { enLateShell } from './shell'
import { enLateAiBuild } from './aibuild'
import { enLateAiJobs } from './aijobs'
import { enLateReviewV2 } from './reviewV2'
import { enLateAiPlan } from './aiplan'
import { enLateAiStudio } from './aistudio'
import { enParts } from '../parts'
import { enV2Notebooks } from '../v2/notebooks'
import { enV2Search } from '../v2/search'
import { enV2Panel } from '../v2/panel'
import { enV8Pen } from '../v8Pen'
import { enV8Tools } from '../v8Tools'

export const enLate = {
  ...enLateAccounts,
  ...enLateAi,
  ...enLateClaude,
  ...enLateCommon,
  ...enLateDatabases,
  ...enLateHelp,
  ...enLateHistory,
  ...enLateHome,
  ...enLateHomeV2,
  ...enLateImportExport,
  ...enLateInk,
  ...enLateLibrary,
  ...enLateLock,
  ...enLateMedia,
  ...enLateReading,
  ...enLateRecall,
  ...enLateSearch,
  ...enLateSettings,
  ...enLateSidebar,
  ...enLateSync,
  ...enLateToolbar,
  ...enLateUpdates,
  ...enLateUpdateV2,
  ...enLateFlags,
  ...enLateSlashMenu,
  ...enLateShell,
  ...enLateAiBuild,
  ...enLateAiJobs,
  ...enLateReviewV2,
  ...enLateAiPlan,
  ...enLateAiStudio,
  ...enParts,
  ...enV2Notebooks,
  ...enV2Search,
  ...enV2Panel,
  ...enLateLibraryV2,
  ...enV8Pen,
  ...enV8Tools,
}
