import type { LearningNotesDB } from '../../core/db'
import { t } from '../../i18n/t'

/**
 * Settings v3 (flag `settings.v3`). Loaded only when the flag is ON and the
 * Settings page opens (React.lazy in App.tsx). Step 1 holds the place; the
 * real screen arrives in the next commits. Flag OFF never loads this file.
 */
export function SettingsV3({
  focusId,
}: {
  db: LearningNotesDB
  focusId?: string
}) {
  return (
    <div data-settings-v3 data-focus={focusId} className="px-4 pt-8 pb-24">
      <h1 className="text-[32px] leading-tight font-bold tracking-[-0.02em]">
        {t('settings.title')}
      </h1>
    </div>
  )
}
