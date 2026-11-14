/**
 * English text for the app. Every new piece of on-screen text gets a key
 * in the file of its feature and is shown with `t('key')`.
 * Read README.md in the folder above before adding texts.
 *
 * Plurals: give `key_one`, `key_other` (and other Intl plural forms as a
 * language needs), then call `t('key', { count })`.
 */
import { enAccounts } from './accounts'
import { enCommon } from './common'
import { enHelp } from './help'
import { enHome } from './home'
import { enInk } from './ink'
import { enLibrary } from './library'
import { enRecall } from './recall'
import { enSearch } from './search'
import { enSidebar } from './sidebar'
import { enSync } from './sync'
import { enTags } from './tags'
import { enToolbar } from './toolbar'
import { enUpdates } from './updates'

export const en = {
  ...enAccounts,
  ...enCommon,
  ...enHelp,
  ...enHome,
  ...enInk,
  ...enLibrary,
  ...enRecall,
  ...enSearch,
  ...enSidebar,
  ...enSync,
  ...enTags,
  ...enToolbar,
  ...enUpdates,
}
