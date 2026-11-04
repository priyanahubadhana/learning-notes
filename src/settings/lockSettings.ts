import { DEFAULT_IDLE_MINUTES, IDLE_CHOICES } from '../core/lock/lockState'
import { t, type MessageKey } from '../i18n/t'
import { settingsRegistry } from './builtinSettings'
import { isOneOf, type SettingDefinition } from './registry'

/**
 * Settings › Lock. The codes and locked items are managed on the Lock
 * screen part (LockSection); this file holds the one plain setting, how
 * long to wait before locking again.
 */

settingsRegistry.registerCategory({
  id: 'lock',
  labelKey: 'settings.category.lock',
  descriptionKey: 'settings.category.lock.hint',
  order: 45,
})

export const lockIdleSetting: SettingDefinition<number> = {
  id: 'lock.idleMinutes',
  labelKey: 'settings.lock.idle.label',
  descriptionKey: 'settings.lock.idle.description',
  category: 'lock',
  keywords: 'lock privacy pin password face id touch id idle minutes relock',
  scope: 'device',
  defaultValue: DEFAULT_IDLE_MINUTES,
  isValid: isOneOf(IDLE_CHOICES as readonly number[]),
  control: {
    kind: 'select',
    options: IDLE_CHOICES.map((value) => ({
      value,
      label: () => t('lock.idle.minutes' as MessageKey, { count: value }),
    })),
  },
}

settingsRegistry.register(lockIdleSetting as unknown as SettingDefinition)
