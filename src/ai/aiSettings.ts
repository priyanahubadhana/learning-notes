import { settingsRegistry } from '../settings/builtinSettings'

/**
 * Settings › AI (CR4). The whole page is `AiSection` (provider, key, cap,
 * permissions); the category only has to exist. It is off by default.
 */
settingsRegistry.registerCategory({
  id: 'ai',
  labelKey: 'settings.category.ai',
  descriptionKey: 'settings.category.ai.hint',
  order: 47,
})

/** Settings › Permissions (Phase P): the whole page is PermissionsSection. */
settingsRegistry.registerCategory({
  id: 'permissions',
  labelKey: 'settings.category.permissions',
  descriptionKey: 'settings.category.permissions.hint',
  order: 48,
})
