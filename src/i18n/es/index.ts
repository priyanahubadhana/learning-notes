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
import { esFlags } from './flags'

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
  ...esFlags,
}
