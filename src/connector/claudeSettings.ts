import { settingsRegistry } from '../settings/builtinSettings'

/** Settings › Claude: the whole page is ClaudeSection ("Let Claude work with my notes"). */
settingsRegistry.registerCategory({
  id: 'claude',
  labelKey: 'settings.category.claude',
  descriptionKey: 'settings.category.claude.hint',
  order: 49,
})
