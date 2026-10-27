import { isTheme, THEME_PREF_KEY, THEMES, type Theme } from '../app/theme'
import { DEFAULT_DAY_START_HOUR } from '../core/time'
import {
  DEFAULT_LABELS,
  isLabelList,
  type LabelDef,
} from '../revise/reviseMarks'
import {
  isLanguage,
  LANGUAGE_NAMES,
  LANGUAGES,
  type Language,
} from '../i18n/languages'
import { dateLocale, t, type DateStyle } from '../i18n/t'
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

/** Formats an hour of the day in the user's regional style (e.g. "4:00 AM" or "04:00"). */
const hourLabel = (hour: number) => () =>
  new Intl.DateTimeFormat(dateLocale(), {
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

/** The labels for marking words in notes (Revise tab). Saved with the notes. */
export const reviseLabelsSetting: SettingDefinition<LabelDef[]> = {
  id: 'review.reviseLabels',
  labelKey: 'settings.reviseLabels.label',
  descriptionKey: 'settings.reviseLabels.description',
  category: 'review',
  scope: 'synced',
  defaultValue: DEFAULT_LABELS.map((l) => ({ ...l })),
  isValid: isLabelList as (value: unknown) => value is LabelDef[],
  control: { kind: 'labels' },
}

/** The language of the app's texts on this device. */
export const languageSetting: SettingDefinition<Language> = {
  id: 'general.language',
  labelKey: 'settings.language.label',
  descriptionKey: 'settings.language.description',
  category: 'general',
  scope: 'device',
  defaultValue: 'en',
  isValid: isLanguage,
  control: {
    kind: 'segmented',
    options: LANGUAGES.map((value) => ({
      value,
      label: () => LANGUAGE_NAMES[value],
    })),
  },
}

/** Hover tips and help lines (this device). */
export const HELP_CHOICES = ['on', 'off'] as const
export type HelpChoice = (typeof HELP_CHOICES)[number]

export const showHelp: SettingDefinition<HelpChoice> = {
  id: 'general.showHelp',
  labelKey: 'settings.showHelp.label',
  descriptionKey: 'settings.showHelp.description',
  category: 'general',
  scope: 'device',
  defaultValue: 'on',
  isValid: isOneOf<HelpChoice>(HELP_CHOICES),
  control: {
    kind: 'segmented',
    options: HELP_CHOICES.map((value) => ({
      value,
      label: () => t(`settings.showHelp.${value}`),
    })),
  },
}

/** How dates are written on this device. */
export const DATE_STYLES = ['auto', 'dayFirst', 'monthFirst'] as const

export const dateStyleSetting: SettingDefinition<DateStyle> = {
  id: 'general.dateStyle',
  labelKey: 'settings.dateStyle.label',
  descriptionKey: 'settings.dateStyle.description',
  category: 'general',
  scope: 'device',
  defaultValue: 'dayFirst',
  isValid: isOneOf<DateStyle>(DATE_STYLES),
  control: {
    kind: 'segmented',
    options: DATE_STYLES.map((value) => ({
      value,
      label: () => t(`settings.dateStyle.${value}`),
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
  shownWhen: { settingId: 'review.scheduler', values: ['fixed'] },
}

/** How review gaps are picked (ids in `recall/scheduler.ts`). */
export const SCHEDULER_CHOICES = ['fsrs', 'fixed'] as const
export type SchedulerChoice = (typeof SCHEDULER_CHOICES)[number]

export const schedulerChoice: SettingDefinition<SchedulerChoice> = {
  id: 'review.scheduler',
  labelKey: 'settings.scheduler.label',
  descriptionKey: 'settings.scheduler.description',
  category: 'review',
  scope: 'synced',
  defaultValue: 'fsrs',
  isValid: isOneOf<SchedulerChoice>(SCHEDULER_CHOICES),
  control: {
    kind: 'select',
    options: SCHEDULER_CHOICES.map((value) => ({
      value,
      label: () => t(`settings.scheduler.${value}`),
    })),
  },
}

export const targetMemory: SettingDefinition<number> = {
  id: 'review.targetMemory',
  labelKey: 'settings.targetMemory.label',
  descriptionKey: 'settings.targetMemory.description',
  category: 'review',
  scope: 'synced',
  defaultValue: 90,
  isValid: isIntInRange(70, 97),
  control: { kind: 'number', min: 70, max: 97, unitKey: 'unit.percent' },
  shownWhen: { settingId: 'review.scheduler', values: ['fsrs'] },
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

/** Order of a Practice anyway round. */
export const PRACTICE_ORDERS = ['due', 'shuffle'] as const
export type PracticeOrder = (typeof PRACTICE_ORDERS)[number]

export const practiceOrder: SettingDefinition<PracticeOrder> = {
  id: 'review.practiceOrder',
  labelKey: 'settings.practiceOrder.label',
  descriptionKey: 'settings.practiceOrder.description',
  category: 'review',
  scope: 'synced',
  defaultValue: 'due',
  isValid: isOneOf<PracticeOrder>(PRACTICE_ORDERS),
  control: {
    kind: 'segmented',
    options: PRACTICE_ORDERS.map((value) => ({
      value,
      label: () => t(`settings.practiceOrder.${value}`),
    })),
  },
}

for (const definition of [
  theme,
  reviseLabelsSetting,
  languageSetting,
  showHelp,
  dateStyleSetting,
  dayStartHour,
  newCardsPerDay,
  reviewsPerDay,
  schedulerChoice,
  targetMemory,
  againMinutes,
  goodSteps,
  practiceOrder,
  nestedCardPlacement,
]) {
  settingsRegistry.register(definition as SettingDefinition)
}
