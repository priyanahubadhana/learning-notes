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

  // Fill-in-the-blank
  'blank.make': 'Make blank (hide these words in review)',
  'blank.remove': 'Remove blank',
  'blank.button': 'Blank',
  'card.button': 'Card',

  // Review
  'review.title': 'Review',
  'review.titleNotebook': 'Review · {name}',
  'review.titlePage': 'Review · {name}',
  'review.titleMissed': 'Cards I missed',
  'review.sidebar': 'Review',
  'review.sidebarHint': 'Review the cards due today',
  'review.dueCount_one': '{count} card due',
  'review.dueCount_other': '{count} cards due',
  'review.thisNotebook': 'Review this notebook',
  'review.thisPage': 'Review',
  'review.scope': 'Which cards',
  'review.scope.all': 'All due',
  'review.scope.missed': 'Missed (7 days)',
  'review.left_one': '{count} left',
  'review.left_other': '{count} left',
  'review.close': 'Close review',
  'review.show': 'Show answer',
  'review.rating.again': 'Again',
  'review.rating.hard': 'Hard',
  'review.rating.good': 'Good',
  'review.rating.easy': 'Easy',
  'review.rateHint': 'Rate how well you remembered (keys 1–4)',
  'review.blank': 'Hidden words',
  'review.noAnswer': 'This card has no answer yet.',
  'review.from': 'From “{page}”',
  'review.untitled': 'Untitled',
  'review.openNote': 'Open note',
  'review.suspend': 'Suspend',
  'review.suspended': 'Card suspended. It won’t come up in reviews.',
  'review.undo': 'Undo',
  'review.practising': 'Practice: this card’s schedule stays the same.',
  'review.waiting_one': 'Done for now — {count} card comes back in {time}.',
  'review.waiting_other': 'Done for now — {count} cards come back in {time}.',
  'review.waitingHint': 'Keep this open; they appear by themselves.',
  'review.done': 'All caught up.',
  'review.doneCount_one': 'You reviewed {count} card.',
  'review.doneCount_other': 'You reviewed {count} cards.',
  'review.nothingDue': 'No cards are due here right now.',
  'review.noCards':
    'No cards here yet. Type “/” and choose Card, or highlight words and choose Blank.',
  'review.practice': 'Practice anyway',
  'review.practiceHint':
    'Go through cards early. Their schedules stay the same.',
  'review.back': 'Back to notes',

  // Intervals (button labels)
  'interval.minutes_one': '{count} min',
  'interval.minutes_other': '{count} min',
  'interval.days_one': '{count} day',
  'interval.days_other': '{count} days',
  'interval.countdown': '{m}:{s}',

  // Units
  'unit.minutes': 'minutes',
  'unit.days': 'days',
} as const
