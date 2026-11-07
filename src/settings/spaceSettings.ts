import { HIDEABLE_SPACES, type Space } from '../app/spaces/spaces'
import { t, type MessageKey } from '../i18n/t'
import { settingsRegistry } from './builtinSettings'
import { isOneOf, type SettingDefinition } from './registry'
import { useDeviceSetting } from './useSetting'

/**
 * Settings › General › Home, Library and Review spaces: show or hide each
 * whole space in the strip (this device). Notebooks cannot be hidden, so the
 * app always has a place to start. A hidden space's tools stay reachable
 * from Search.
 */
const SPACE_CHOICES = ['show', 'hide'] as const
export type SpaceChoice = (typeof SPACE_CHOICES)[number]

const define = (space: Space): SettingDefinition<SpaceChoice> => ({
  id: `general.space.${space}`,
  labelKey: `settings.space.${space}.label` as MessageKey,
  descriptionKey: 'settings.space.description',
  category: 'general',
  scope: 'device',
  defaultValue: 'show',
  isValid: isOneOf<SpaceChoice>(SPACE_CHOICES),
  keywords: 'space spaces hide show home library review tab strip',
  control: {
    kind: 'segmented',
    options: SPACE_CHOICES.map((value) => ({
      value,
      label: () => t(`settings.space.${value}` as MessageKey),
    })),
  },
})

export const spaceSettings: Record<
  string,
  SettingDefinition<SpaceChoice>
> = Object.fromEntries(HIDEABLE_SPACES.map((s) => [s, define(s)]))

for (const definition of Object.values(spaceSettings)) {
  settingsRegistry.register(definition as SettingDefinition)
}

/** The spaces hidden on this device (live: follows Settings). */
export function useHiddenSpaces(): Space[] {
  const [home] = useDeviceSetting(spaceSettings.home)
  const [library] = useDeviceSetting(spaceSettings.library)
  const [review] = useDeviceSetting(spaceSettings.review)
  const hidden: Space[] = []
  if (home === 'hide') hidden.push('home')
  if (library === 'hide') hidden.push('library')
  if (review === 'hide') hidden.push('review')
  return hidden
}
