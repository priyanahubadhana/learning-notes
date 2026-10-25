import { isTheme, THEME_PREF_KEY, THEMES, type Theme } from '../app/theme'
import { DEFAULT_DAY_START_HOUR } from '../core/time'
import { currentLocale, t } from '../i18n/t'
import {
  createSettingsRegistry,
  isIntInRange,
  isOneOf,
  isRisingSteps,
  type SettingDefinition,
} from './registry'

/**
 * The app's built-in categories and settings (Phase 3 needs only these).
 * Each definition is exported so code can read it with full typing,
 * e.g. `getSetting(db, newCardsPerDay)`.
 */

export const settingsRegistry = createSettingsRegistry()

settingsRegistry.registerCategory({
  id: 'general',
  labelKey: 'settings.category.general',
  order: 10,
})
settingsRegistry.registerCategory({
  id: 'review',
  labelKey: 'settings.category.review',
  order: 20,
})
settingsRegistry.registerCategory({
  id: 'journal',
  labelKey: 'settings.category.journal',
  order: 30,
})
settingsRegistry.registerCategory({
  id: 'apis',
  labelKey: 'settings.category.apis',
  order: 90,
  emptyKey: 'settings.apis.empty',
})

/** Formats an hour of the day in the user's language (e.g. "4:00 AM"). */
const hourLabel = (hour: number) => () =>
  new Intl.DateTimeFormat(currentLocale(), {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(2000, 0, 1, hour))

const DAY_START_HOURS = [0, 1, 2, 3, 4, 5, 6] as const

export const theme: SettingDefinition<Theme> = {
  id: 'general.theme',
  labelKey: 'settings.theme.label',
  descriptionKey: 'settings.theme.description',
  category: 'general',
  scope: 'device',
  storageKey: THEME_PREF_KEY, // same key as before, so the saved theme is kept
  defaultValue: 'day',
  isValid: isTheme,
  control: {
    kind: 'segmented',
    options: THEMES.map((value) => ({
      value,
      label: () => t(`settings.theme.${value}`),
    })),
  },
}

export const dayStartHour: SettingDefinition<number> = {
  id: 'general.dayStartHour',
  labelKey: 'settings.dayStart.label',
  descriptionKey: 'settings.dayStart.description',
  category: 'general',
  alsoIn: ['review', 'journal'],
  scope: 'synced',
  defaultValue: DEFAULT_DAY_START_HOUR,
  isValid: isOneOf<number>(DAY_START_HOURS),
  control: {
    kind: 'select',
    options: DAY_START_HOURS.map((h) => ({ value: h, label: hourLabel(h) })),
  },
}

export const newCardsPerDay: SettingDefinition<number> = {
  id: 'review.newPerDay',
  labelKey: 'settings.newPerDay.label',
  descriptionKey: 'settings.newPerDay.description',
  category: 'review',
  scope: 'synced',
  defaultValue: 20,
  isValid: isIntInRange(0, 9999),
  control: { kind: 'number', min: 0, max: 9999 },
}

/** null = no limit. */
export const reviewsPerDay: SettingDefinition<number | null> = {
  id: 'review.maxPerDay',
  labelKey: 'settings.maxPerDay.label',
  descriptionKey: 'settings.maxPerDay.description',
  category: 'review',
  scope: 'synced',
  defaultValue: null,
  isValid: (v): v is number | null => v === null || isIntInRange(1, 99999)(v),
  control: {
    kind: 'number',
    min: 1,
    max: 99999,
    emptyKey: 'settings.maxPerDay.empty',
  },
}

export const againMinutes: SettingDefinition<number> = {
  id: 'review.againMinutes',
  labelKey: 'settings.againMinutes.label',
  descriptionKey: 'settings.againMinutes.description',
  category: 'review',
  scope: 'synced',
  defaultValue: 10,
  isValid: isIntInRange(1, 1440),
  control: { kind: 'number', min: 1, max: 1440, unitKey: 'unit.minutes' },
}

const STEP_LIMITS = { min: 1, max: 36500, maxCount: 20 }

export const goodSteps: SettingDefinition<number[]> = {
  id: 'review.goodSteps',
  labelKey: 'settings.goodSteps.label',
  descriptionKey: 'settings.goodSteps.description',
  category: 'review',
  scope: 'synced',
  defaultValue: [1, 3, 7, 14, 30, 60],
  isValid: isRisingSteps(
    STEP_LIMITS.min,
    STEP_LIMITS.max,
    STEP_LIMITS.maxCount,
  ),
  control: { kind: 'steps', ...STEP_LIMITS, unitKey: 'unit.days' },
}

/** Where "/card" puts a new card when typed inside a card's answer. */
export const NESTED_CARD_CHOICES = ['ask', 'nextLine', 'inside'] as const
export type NestedCardChoice = (typeof NESTED_CARD_CHOICES)[number]

export const nestedCardPlacement: SettingDefinition<NestedCardChoice> = {
  id: 'review.nestedCard',
  labelKey: 'settings.nestedCard.label',
  descriptionKey: 'settings.nestedCard.description',
  category: 'review',
  scope: 'synced',
  defaultValue: 'ask',
  isValid: isOneOf<NestedCardChoice>(NESTED_CARD_CHOICES),
  control: {
    kind: 'select',
    options: NESTED_CARD_CHOICES.map((value) => ({
      value,
      label: () => t(`settings.nestedCard.${value}`),
    })),
  },
}

for (const definition of [
  theme,
  dayStartHour,
  newCardsPerDay,
  reviewsPerDay,
  againMinutes,
  goodSteps,
  nestedCardPlacement,
]) {
  settingsRegistry.register(definition as SettingDefinition)
}
