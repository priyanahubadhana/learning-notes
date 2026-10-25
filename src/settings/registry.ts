import type { JsonValue } from '../core/types'
import type { MessageKey } from '../i18n/t'

/**
 * Settings registry: the plug-in point for settings (like block types).
 *
 * Each setting is defined once: id, text keys, home category, extra
 * categories, default, validation and control. It can appear in several
 * categories but is always the same control with one stored value. Adding a
 * setting means registering a definition; the Settings screen and storage
 * need no changes.
 */

/** A section of the Settings screen. */
export interface SettingCategory {
  id: string
  labelKey: MessageKey
  /** Position in the category list (lower comes first). */
  order: number
  /** Text shown when the category has no settings yet. */
  emptyKey?: MessageKey
}

/** One choice of a select/segmented control. */
export interface SettingOption {
  value: string | number
  /** Display text, computed at render time (so it follows the language). */
  label: () => string
}

/** How the Settings screen shows and edits a setting. */
export type SettingControl =
  | {
      kind: 'number'
      min: number
      max: number
      unitKey?: MessageKey
      /** If set, an empty field is allowed and saved as null. */
      emptyKey?: MessageKey
    }
  | { kind: 'segmented' | 'select'; options: readonly SettingOption[] }
  | {
      /** A rising list of whole numbers, e.g. review steps in days. */
      kind: 'steps'
      min: number
      max: number
      maxCount: number
      unitKey: MessageKey
    }

/** Where the value is kept. 'synced' = with the notes; 'device' = browser. */
export type SettingScope = 'synced' | 'device'

export interface SettingDefinition<T extends JsonValue = JsonValue> {
  /** Stable id, e.g. 'review.newPerDay'. Never rename once released. */
  id: string
  labelKey: MessageKey
  descriptionKey: MessageKey
  /** Home category id. */
  category: string
  /** Other categories that also show this same setting. */
  alsoIn?: readonly string[]
  scope: SettingScope
  /** Device settings only: storage key, if it differs from `id`. */
  storageKey?: string
  defaultValue: T
  /** Checks any stored or entered value; invalid values are never saved. */
  isValid: (value: unknown) => value is T
  control: SettingControl
}

export interface SettingsRegistry {
  /** Adds a category. Throws if the id is taken. */
  registerCategory: (category: SettingCategory) => void
  /** Adds a setting. Throws if the id is taken or a category is unknown. */
  register: <T extends JsonValue>(definition: SettingDefinition<T>) => void
  get: (id: string) => SettingDefinition | undefined
  /** All categories, sorted by `order`. */
  categories: () => SettingCategory[]
  /** All settings, in registration order. */
  list: () => SettingDefinition[]
  /** Settings shown in a category (home or "also in"). */
  inCategory: (categoryId: string) => SettingDefinition[]
}

export function createSettingsRegistry(): SettingsRegistry {
  const categories = new Map<string, SettingCategory>()
  const settings = new Map<string, SettingDefinition>()

  const registry: SettingsRegistry = {
    registerCategory(category) {
      if (categories.has(category.id)) {
        throw new Error(`Settings category already registered: ${category.id}`)
      }
      categories.set(category.id, category)
    },
    register(definition) {
      if (settings.has(definition.id)) {
        throw new Error(`Setting already registered: ${definition.id}`)
      }
      for (const id of [definition.category, ...(definition.alsoIn ?? [])]) {
        if (!categories.has(id)) {
          throw new Error(`Unknown settings category "${id}"`)
        }
      }
      if (!definition.isValid(definition.defaultValue)) {
        throw new Error(`Invalid default for setting ${definition.id}`)
      }
      settings.set(definition.id, definition as unknown as SettingDefinition)
    },
    get: (id) => settings.get(id),
    categories: () =>
      [...categories.values()].sort((a, b) => a.order - b.order),
    list: () => [...settings.values()],
    inCategory: (categoryId) =>
      [...settings.values()].filter(
        (s) =>
          s.category === categoryId || (s.alsoIn ?? []).includes(categoryId),
      ),
  }
  return registry
}

// ---- Validators shared by setting definitions ----

/** A whole number from min to max. */
export const isIntInRange =
  (min: number, max: number) =>
  (value: unknown): value is number =>
    Number.isInteger(value) &&
    (value as number) >= min &&
    (value as number) <= max

/** One of a fixed list of values. */
export const isOneOf =
  <T extends string | number>(values: readonly T[]) =>
  (value: unknown): value is T =>
    (values as readonly unknown[]).includes(value)

/** A strictly rising list of whole numbers, 1 to maxCount items. */
export const isRisingSteps =
  (min: number, max: number, maxCount: number) =>
  (value: unknown): value is number[] =>
    Array.isArray(value) &&
    value.length >= 1 &&
    value.length <= maxCount &&
    value.every(
      (v, i) =>
        Number.isInteger(v) &&
        v >= min &&
        v <= max &&
        (i === 0 || v > (value[i - 1] as number)),
    )
