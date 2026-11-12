/** English texts that load after the first screen (kept out of the first download). */
import { enLateAccounts } from './accounts'
import { enLateAi } from './ai'
import { enLateClaude } from './claude'
import { enLateCommon } from './common'
import { enLateDatabases } from './databases'
import { enLateHelp } from './help'
import { enLateHistory } from './history'
import { enLateHome } from './home'
import { enLateImportExport } from './importExport'
import { enLateInk } from './ink'
import { enLateLibrary } from './library'
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
import { enLateAiBuild } from './aibuild'
import { enLateAiJobs } from './aijobs'
import { enParts } from '../parts'
import { enV2Notebooks } from '../v2/notebooks'
import { enV2Search } from '../v2/search'
import { enV2Panel } from '../v2/panel'

export const enLate = {
  ...enLateAccounts,
  ...enLateAi,
  ...enLateClaude,
  ...enLateCommon,
  ...enLateDatabases,
  ...enLateHelp,
  ...enLateHistory,
  ...enLateHome,
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
  ...enLateAiBuild,
  ...enLateAiJobs,
  ...enParts,
  ...enV2Notebooks,
  ...enV2Search,
  ...enV2Panel,
}
