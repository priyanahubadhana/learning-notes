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
