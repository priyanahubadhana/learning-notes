import { useState, useSyncExternalStore } from 'react'
import { MenuPopover, type MenuItem } from '../app/ui'
import { t } from '../i18n/t'
import { groupOf, type SettingDefinition } from './registry'
import {
  keepOnThisDevice,
  resetToSynced,
  shareThisDeviceValue,
} from './settingsMirror'
import {
  groupOn,
  hasOverride,
  subscribeSyncPrefs,
  syncPrefsEpoch,
} from './syncPrefs'

const Icon = ({ cloud }: { cloud: boolean }) => (
  <svg
    viewBox="0 0 16 16"
    width="12"
    height="12"
    aria-hidden="true"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.4"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {cloud ? (
      <path d="M4.5 12.5a3 3 0 0 1-.4-5.97 4 4 0 0 1 7.7 1.1A2.5 2.5 0 0 1 11.5 12.5z" />
    ) : (
      <>
        <rect x="2" y="3" width="12" height="8" rx="1.2" />
        <path d="M5.5 13.5h5" />
      </>
    )}
  </svg>
)

/**
 * The small tag on a setting row ("All devices", "This device", "This device
 * only") and, for settings that follow you, the menu to keep one value on this
 * device or use it everywhere.
 */
export function SettingSyncBadge({
  definition,
}: {
  definition: SettingDefinition
}) {
  useSyncExternalStore(subscribeSyncPrefs, syncPrefsEpoch)
  const group = groupOf(definition)
  const [anchor, setAnchor] = useState<DOMRect | null>(null)

  const tag = 'rounded-full border border-line px-2 text-[11px] text-muted'
  if (!group) {
    return (
      <span title={t('settings.scope.device.hint')} className={tag}>
        <span className="inline-flex items-center gap-1">
          <Icon cloud={false} />
          {t('setting.tag.device')}
        </span>
      </span>
    )
  }
  const own = hasOverride(definition.id) || !groupOn(group)
  const run = (fn: () => void | Promise<void>) => {
    setAnchor(null)
    void fn()
  }
  const items: MenuItem[] = own
    ? [
        {
          label: t('setting.menu.everywhere'),
          icon: '☁',
          onSelect: () => run(() => shareThisDeviceValue(definition.id)),
        },
        {
          label: t('setting.menu.reset'),
          icon: '↺',
          onSelect: () => run(() => resetToSynced(definition.id)),
        },
      ]
    : [
        {
          label: t('setting.menu.keep'),
          icon: '▭',
          onSelect: () => run(() => keepOnThisDevice(definition.id)),
        },
      ]
  return (
    <span className="relative inline-flex items-center gap-1">
      <span
        data-testid="setting-tag"
        title={t('settings.scope.synced.hint')}
        className={tag}
      >
        <span className="inline-flex items-center gap-1">
          <Icon cloud={!own} />
          {t(own ? 'setting.tag.only' : 'setting.tag.all')}
        </span>
      </span>
      <button
        type="button"
        data-testid="setting-sync-menu"
        aria-haspopup="menu"
        aria-expanded={!!anchor}
        aria-label={t('setting.menu.label', { name: t(definition.labelKey) })}
        onClick={(e) =>
          setAnchor(anchor ? null : e.currentTarget.getBoundingClientRect())
        }
        className="-my-2 inline-flex min-h-11 min-w-11 items-center justify-center rounded-md text-muted hover:bg-hover"
      >
        <span aria-hidden="true">⋯</span>
      </button>
      {anchor && (
        <MenuPopover
          anchor={anchor}
          items={items}
          label={t('setting.menu.label', { name: t(definition.labelKey) })}
          onClose={() => setAnchor(null)}
        />
      )}
    </span>
  )
}
