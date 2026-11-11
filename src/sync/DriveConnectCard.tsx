import { t } from '../i18n/t'
import { linkGoogleAccount } from './syncService'

const primary =
  'min-h-11 rounded-lg bg-accent px-4 text-sm font-semibold text-white disabled:opacity-50'

/**
 * Shown to an account that signs in only by email: Drive backup needs Google.
 * One clear button (Connect Google), no jargon. The notes themselves still
 * sync without it.
 */
export function DriveConnectCard({ onDone }: { onDone?: () => void }) {
  return (
    <div
      className="flex flex-col gap-2 rounded-xl border border-line p-3"
      data-testid="drive-connect-google"
      data-setting-id="account.driveLasting"
    >
      <p className="text-sm font-medium">{t('drive.google.title')}</p>
      <p className="text-sm text-muted">{t('drive.google.body')}</p>
      <div>
        <button
          type="button"
          className={primary}
          data-testid="drive-connect-google-button"
          onClick={() => void linkGoogleAccount().then(onDone)}
        >
          {t('drive.google.connect')}
        </button>
      </div>
    </div>
  )
}
