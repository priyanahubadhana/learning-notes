import { useEffect, useState } from 'react'
import { t } from '../../i18n/t'
import type { LearningNotesDB } from '../../core/db'
import { dismissUpdateOffer } from '../updates'
import { browserSnooze, snooze, type Attention } from './attentionLevel'
import { getAppActions } from '../tools/toolRuntime'
import { getSignals, setSignals } from './attentionSignals'

type Action = { label: string; run: () => void }

const go = (focus: string) => () => {
  const open = getAppActions()?.openSettings
  if (open) open(focus)
  else location.hash = '#/settings'
}

/** The text, and the one button that fixes it. */
function content(
  code: Attention['code'],
  db: LearningNotesDB,
  googleLinked: boolean | null,
): { text: string; action: Action } {
  switch (code) {
    case 'driveTap':
      return googleLinked === false
        ? {
            // Signed in by email only: the fix is to connect Google.
            text: t('attention.driveNeedsGoogle'),
            action: {
              label: t('drive.google.connect'),
              run: () =>
                void import('../../sync/syncService').then((m) =>
                  m.linkGoogleAccount(),
                ),
            },
          }
        : {
            text: t('attention.driveTap'),
            action: {
              label: t('sync.reconnectDrive'),
              run: () =>
                void import('../../sync/syncService').then((m) =>
                  m.reconnectDrive(db),
                ),
            },
          }
    case 'driveFull':
      return {
        text: t('attention.driveFull'),
        action: {
          label: t('attention.openDrive'),
          run: () =>
            void window.open(
              'https://one.google.com/storage',
              '_blank',
              'noopener',
            ),
        },
      }
    case 'notAllowed':
      return {
        text: t('attention.notAllowed'),
        action: {
          label: t('attention.switch'),
          run: go('account/account.syncNow'),
        },
      }
    case 'clock':
      return {
        text: t('attention.clock'),
        action: {
          label: t('attention.details'),
          run: go('account/account.syncNow'),
        },
      }
    case 'signInAgain':
      return {
        text: t('attention.signInAgain'),
        action: {
          label: t('attention.signIn'),
          run: go('account/account.signIn'),
        },
      }
    case 'syncFailing':
      return {
        text: t('attention.syncFailing'),
        action: {
          label: t('attention.tryAgain'),
          run: () =>
            void import('../../sync/syncService').then((m) => m.syncNow(db)),
        },
      }
    case 'backups':
      return {
        text: t('attention.backups'),
        action: {
          label: t('attention.openBackups'),
          run: go('category:data'),
        },
      }
    case 'updateNeeded':
      return {
        text: t('attention.updateNeeded'),
        action: {
          label: t('update.now'),
          run: () => getSignals().applyUpdate?.(),
        },
      }
    case 'storage':
      return {
        text: t('attention.storage'),
        action: { label: t('attention.manage'), run: go('category:data') },
      }
    case 'setup':
      return {
        text: t('attention.setup'),
        action: {
          label: t('attention.setUp'),
          run: go('account/account.syncNow'),
        },
      }
    default:
      return {
        text: t('update.ready'),
        action: {
          label: t('update.now'),
          run: () => getSignals().applyUpdate?.(),
        },
      }
  }
}

/**
 * Levels 2 and 3 of the alerts system: one banner at the top, pushing the
 * page down. Polite live region; one fixing button and a Dismiss.
 */
export function AttentionBanner({
  db,
  attention,
  session,
  onDismissed,
}: {
  db: LearningNotesDB
  attention: Attention
  session: number
  onDismissed: () => void
}) {
  useEffect(() => {
    const root = document.documentElement
    root.style.setProperty('--attn-h', '44px')
    return () => {
      root.style.removeProperty('--attn-h')
    }
  }, [])
  // Drive needs Google: an account that signs in only by email is told so.
  const [googleLinked, setGoogleLinked] = useState<boolean | null>(null)
  useEffect(() => {
    if (attention.code !== 'driveTap') return
    let live = true
    void import('../../sync/syncService')
      .then(async (m) => {
        const methods = await m.accountAuth().methods?.()
        if (live) setGoogleLinked(methods ? !!methods.google : null)
      })
      .catch(() => undefined)
    return () => {
      live = false
    }
  }, [attention.code])
  const { text, action } = content(attention.code, db, googleLinked)
  const bright = attention.level === 2
  const button = bright ? 'hover:bg-white/15' : 'text-accent hover:bg-accent/10'
  return (
    <div
      role="status"
      aria-live="polite"
      data-chrome
      data-testid="attention-banner"
      data-code={attention.code}
      className={`fixed inset-x-0 top-0 z-40 flex min-h-11 items-center justify-center gap-2 px-4 pt-[env(safe-area-inset-top)] text-[13px] ${
        bright
          ? 'bg-accent font-medium text-white'
          : 'border-b border-line bg-hover text-ink'
      }`}
    >
      <span>{text}</span>
      <button
        type="button"
        onClick={action.run}
        className={`min-h-9 rounded-md px-2.5 font-semibold underline underline-offset-2 ${button}`}
      >
        {action.label}
      </button>
      <button
        type="button"
        aria-label={t('attention.dismiss')}
        onClick={() => {
          if (attention.code === 'update') dismissUpdateOffer()
          snooze(attention, browserSnooze(), Date.now(), session)
          if (attention.code === 'update') setSignals({}) // redraw readers
          onDismissed()
        }}
        className={`min-h-9 min-w-9 rounded-md ${button}`}
      >
        ×
      </button>
    </div>
  )
}
