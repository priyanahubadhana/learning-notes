/**
 * English text for the app. Every new piece of on-screen text gets a key
 * in the file of its feature and is shown with `t('key')`.
 * Read README.md in the folder above before adding texts.
 *
 * Plurals: give `key_one`, `key_other` (and other Intl plural forms as a
 * language needs), then call `t('key', { count })`.
 */
import { enAccounts } from './accounts'
import { enAi } from './ai'
import { enCommon } from './common'
import { enDatabases } from './databases'
import { enEditor } from './editor'
import { enHelp } from './help'
import { enHistory } from './history'
import { enHome } from './home'
import { enImportExport } from './importExport'
import { enInk } from './ink'
import { enLibrary } from './library'
import { enLock } from './lock'
import { enMedia } from './media'
import { enPdf } from './pdf'
import { enReading } from './reading'
import { enRecall } from './recall'
import { enSearch } from './search'
import { enSettings } from './settings'
import { enSidebar } from './sidebar'
import { enSync } from './sync'
import { enTags } from './tags'
import { enToolbar } from './toolbar'
import { enUpdates } from './updates'

export const en = {
  ...enAccounts,
  ...enAi,
  ...enCommon,
  ...enDatabases,
  ...enEditor,
  ...enHelp,
  ...enHistory,
  ...enHome,
  ...enImportExport,
  ...enInk,
  ...enLibrary,
  ...enLock,
  ...enMedia,
  ...enPdf,
  ...enReading,
  ...enRecall,
  ...enSearch,
  ...enSettings,
  ...enSidebar,
  ...enSync,
  ...enTags,
  ...enToolbar,
  ...enUpdates,
}
