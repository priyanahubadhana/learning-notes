import { usePref } from '../app/usePref'
import { t } from '../i18n/t'
import {
  DEFAULT_TABS_PREF,
  EXTRA_TABS,
  EXTRA_TAB_LABEL,
  cleanTabs,
  type ExtraTab,
} from '../notebooks/pageTabs'

const isList = (v: unknown): v is unknown[] => Array.isArray(v)

function Ticks({
  name,
  on,
  onChange,
}: {
  name: string
  on: readonly ExtraTab[]
  onChange: (tab: ExtraTab, on: boolean) => void
}) {
  return (
    <div role="group" aria-label={name} className="flex flex-wrap gap-x-4">
      {EXTRA_TABS.map((tab) => (
        <label key={tab} className="flex min-h-11 items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={on.includes(tab)}
            onChange={(e) => onChange(tab, e.target.checked)}
          />
          {t(EXTRA_TAB_LABEL[tab])}
        </label>
      ))}
    </div>
  )
}

/**
 * Settings › General › Page tabs: which optional tabs (Mind map, Slides,
 * Audio & video, Database) new notebooks start with. Each notebook changes
 * its own in the ⋯ on its tab row. Off by default.
 */
export function PageTabsSection() {
  const [stored, setStored] = usePref(DEFAULT_TABS_PREF, isList, [])
  const defaults = cleanTabs(stored)
  return (
    <section
      aria-label={t('tabs.settings.title')}
      className="mb-4 grid gap-2 border-b border-line pb-4"
      data-setting-id="general.pageTabs"
    >
      <h2 className="text-[15px] font-semibold">{t('tabs.settings.title')}</h2>
      <p className="text-sm text-muted">{t('tabs.settings.text')}</p>
      <h3 className="text-sm font-semibold">{t('tabs.settings.default')}</h3>
      <Ticks
        name={t('tabs.settings.default')}
        on={defaults}
        onChange={(tab, on) =>
          setStored(
            EXTRA_TABS.filter((x) => (x === tab ? on : defaults.includes(x))),
          )
        }
      />
    </section>
  )
}
