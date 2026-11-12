import { lazy, Suspense, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Card } from '../../design/parts/Card'
import { DeviceModeMenuRow } from '../DeviceModeMenu'
import { THEMES, type Theme } from '../theme'
import type { LearningNotesDB } from '../../core/db'
import { t } from '../../i18n/t'
import { TrashSection } from '../../trash/TrashSection'
import { SyncDot } from '../../sync/SyncDot'
import { Icon } from '../tools/icons'

const LayerGallery = lazy(() =>
  import('../../layers/LayerGallery').then((m) => ({
    default: m.LayerGallery,
  })),
)

/** What the gear menu needs from the app (all of it already exists today). */
export interface GearActions {
  db: LearningNotesDB
  workspaceId: string
  theme: Theme
  onTheme: (theme: Theme) => void
  settingsOpen: boolean
  dataOpen: boolean
  onOpenSettings: () => void
  onOpenData: () => void
  onOpenHelp: () => void
}

/**
 * The shared card announces itself as a dialog. This menu is a region, like
 * today's corner panel, so a real dialog opened from it (Delete forever) is
 * the only dialog on the screen.
 */
function asRegion(el: HTMLElement | null): void {
  el?.closest('[role="dialog"]')?.setAttribute('role', 'region')
}

const ROW =
  'flex min-h-11 w-full items-center gap-2 rounded-lg px-2.5 text-left text-sm hover:bg-hover'

/**
 * "Settings and more" (spec 2): one menu, the same on the rail and the phone
 * tab bar. `trigger` draws the button; the menu is the shared card (it closes
 * on Esc, a tap outside, or the ✕).
 */
export function GearMenu({
  actions,
  trigger,
}: {
  actions: GearActions
  trigger: (props: {
    open: boolean
    onClick: (el: HTMLButtonElement) => void
  }) => ReactNode
}) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)
  const [layers, setLayers] = useState(false)
  const pick = (run: () => void) => () => {
    setAnchor(null)
    run()
  }
  return (
    <>
      {trigger({
        open: !!anchor,
        onClick: (el) => setAnchor(anchor ? null : el),
      })}
      {anchor && (
        <Card
          anchor={anchor}
          size="pick"
          title={t('shell.gear')}
          testId="corner-panel"
          onClose={() => setAnchor(null)}
        >
          <div ref={asRegion} className="flex flex-col gap-0.5">
            <button
              type="button"
              onClick={pick(actions.onOpenSettings)}
              aria-current={actions.settingsOpen ? 'page' : undefined}
              className={`${ROW} ${actions.settingsOpen ? 'bg-hover font-semibold' : ''}`}
            >
              <span aria-hidden className="text-muted">
                <Icon name="settings" size={18} />
              </span>
              {t('settings.title')}
              <SyncDot className="ms-auto" />
            </button>
            <button
              type="button"
              onClick={pick(actions.onOpenData)}
              aria-current={actions.dataOpen ? 'page' : undefined}
              className={`${ROW} ${actions.dataOpen ? 'bg-hover font-semibold' : ''}`}
            >
              <span aria-hidden className="text-muted">
                ⤓
              </span>
              {t('sidebar.data')}
            </button>
            <div className="px-0.5">
              <TrashSection db={actions.db} workspaceId={actions.workspaceId} />
            </div>
            <DeviceModeMenuRow className={ROW} />
            <button
              type="button"
              data-testid="layer-gallery-open"
              onClick={pick(() => setLayers(true))}
              className={ROW}
            >
              <span aria-hidden className="text-muted">
                ◫
              </span>
              {t('layers.open')}
            </button>
            <button
              type="button"
              data-testid="refresh-app"
              onClick={pick(() => {
                void import('../softRefresh').then((m) => m.refreshNow())
              })}
              className={ROW}
            >
              <span aria-hidden className="text-muted">
                ↻
              </span>
              {t('refresh.app')}
            </button>
            <button
              type="button"
              onClick={pick(actions.onOpenHelp)}
              className={ROW}
            >
              <span aria-hidden className="text-muted">
                ?
              </span>
              {t('corner.help')}
            </button>
            <div
              role="group"
              aria-label={t('sidebar.theme.label')}
              className="flex gap-1.5 p-2"
            >
              {THEMES.map((name) => (
                <button
                  key={name}
                  type="button"
                  aria-pressed={actions.theme === name}
                  onClick={() => actions.onTheme(name)}
                  className={`min-h-11 flex-1 rounded-lg border bg-bg p-1.5 text-xs transition-colors ${
                    actions.theme === name
                      ? 'border-accent text-accent'
                      : 'border-line text-ink'
                  }`}
                >
                  {t(`theme.${name}`)}
                </button>
              ))}
            </div>
          </div>
        </Card>
      )}
      {layers &&
        createPortal(
          <Suspense fallback={null}>
            <LayerGallery
              db={actions.db}
              workspaceId={actions.workspaceId}
              onClose={() => setLayers(false)}
            />
          </Suspense>,
          document.body,
        )}
    </>
  )
}
