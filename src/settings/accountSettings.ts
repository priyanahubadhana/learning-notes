import type { MessageKey } from '../i18n/t'
import { settingsRegistry } from './builtinSettings'
import type { SettingDefinition } from './registry'

/**
 * Settings › Account. The page is `AccountSection` (sync/AccountSection.tsx);
 * these entries only make its items findable in "Search all features". Each
 * is `searchOnly`: it never draws a row, and a search result opens the
 * Account page at the item (the section marks it with `data-setting-id`).
 */
settingsRegistry.registerCategory({
  id: 'account',
  labelKey: 'settings.category.account',
  descriptionKey: 'settings.category.account.hint',
  order: 5,
})

const item = (
  id: string,
  labelKey: MessageKey,
  descriptionKey: MessageKey,
  keywords: string,
): SettingDefinition<boolean> => ({
  id: `account.${id}`,
  labelKey,
  descriptionKey,
  category: 'account',
  scope: 'device',
  searchOnly: true,
  keywords: `account ${keywords}`,
  defaultValue: false,
  isValid: (v): v is boolean => typeof v === 'boolean',
  control: { kind: 'action', buttonKey: labelKey, run: () => undefined },
})

for (const s of [
  item('signIn', 'sync.signIn', 'account.signIn.hint', 'google login sign in'),
  item(
    'driveLasting',
    'sync.driveSetUp',
    'account.driveLasting.hint',
    'google drive reconnect connection',
  ),
  item(
    'syncNow',
    'sync.syncNow',
    'account.syncNow.hint',
    'sync last synced status',
  ),
  item(
    'newCode',
    'sync.newCode',
    'account.newCode.hint',
    'recovery code passphrase unlock key',
  ),
  item(
    'pinLock',
    'account.pinLock.label',
    'account.pinLock.hint',
    'pin lock security',
  ),
  item(
    'aiKeys',
    'ai.keysSync',
    'account.aiKeys.hint',
    'ai keys devices security',
  ),
  item('signOut', 'sync.signOut', 'account.signOut.hint', 'log out logout'),
  item(
    'signOutForget',
    'sync.signOutForget',
    'account.signOutForget.hint',
    'log out forget key',
  ),
  item(
    'signOutAll',
    'account.signOutAll',
    'account.signOutAll.hint',
    'log out all devices everywhere sessions',
  ),
])
  settingsRegistry.register(s as unknown as SettingDefinition)
