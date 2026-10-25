/**
 * English text for the app. Every new piece of on-screen text gets a key
 * here and is shown with `t('key')`, so translations can be added later as
 * more files like this one, without touching components.
 *
 * Plurals: give `key_one`, `key_other` (and other Intl plural forms as a
 * language needs), then call `t('key', { count })`.
 */
export const en = {
  // Settings screen
  'settings.title': 'Settings',
  'settings.search': 'Search all settings',
  'settings.noResults': 'No settings match “{query}”.',
  'settings.categories': 'Settings categories',
  'settings.count_one': '{count} setting',
  'settings.count_other': '{count} settings',
  'settings.scope.synced': 'All devices',
  'settings.scope.synced.hint':
    'Saved with your notes, so it will follow you to other devices once sync is added.',
  'settings.scope.device': 'This device',
  'settings.scope.device.hint': 'Only changes this device.',
  'settings.alsoIn': 'Also in: {categories} · same setting',
  'settings.reset': 'Reset to default',
  'settings.error.save': 'Could not save the setting. Please try again.',
  'settings.error.number': 'Enter a whole number from {min} to {max}.',
  'settings.error.steps':
    'Each step must be a whole number of days from {min} to {max}, longer than the one before.',
  'settings.apis.empty':
    'Connections to AI services arrive in a later phase. Keys will be stored encrypted, never as plain text.',

  // Categories
  'settings.category.all': 'All',
  'settings.category.general': 'General',
  'settings.category.review': 'Review',
  'settings.category.journal': 'Journal',
  'settings.category.apis': 'APIs',

  // Individual settings
  'settings.theme.label': 'Theme',
  'settings.theme.description': 'How the app looks on this device.',
  'settings.theme.day': 'Day',
  'settings.theme.night': 'Night',
  'settings.theme.sepia': 'Sepia',
  'settings.dayStart.label': 'Day starts at',
  'settings.dayStart.description':
    'Late-night study before this time still counts as the same day, for reviews and the journal.',
  'settings.newPerDay.label': 'New cards per day',
  'settings.newPerDay.description':
    'How many never-seen cards join your reviews each day. Keeps big batches of new cards from burying you.',
  'settings.maxPerDay.label': 'Reviews per day',
  'settings.maxPerDay.description': 'Leave empty for no limit.',
  'settings.maxPerDay.empty': 'No limit',
  'settings.againMinutes.label': '“Again” brings the card back after',
  'settings.againMinutes.description':
    'The card also comes back later in the same session.',
  'settings.goodSteps.label': 'Steps for “Good”',
  'settings.goodSteps.description':
    'Days between reviews. “Hard” repeats the current step, “Easy” skips one, “Again” starts over.',
  'settings.goodSteps.add': 'Add step',
  'settings.goodSteps.remove': 'Remove last step',
  'settings.goodSteps.step': 'Step {n}, in days',

  // Cards
  'card.make': 'Make card',
  'card.question': 'Q',
  'card.answer': 'A',
  'card.slash.title': 'Card',
  'card.slash.subtext': 'Question with a hidden answer, for review',
  'card.slash.group': 'Recall',

  // Units
  'unit.minutes': 'minutes',
  'unit.days': 'days',
} as const
