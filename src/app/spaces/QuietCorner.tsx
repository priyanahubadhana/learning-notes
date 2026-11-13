import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Settings } from 'lucide-react'
import { DeviceModeMenuRow } from '../DeviceModeMenu'
import { THEMES, type Theme } from '../theme'
import type { LearningNotesDB } from '../../core/db'
import { useFootLift } from './footLift'
import { Tip } from '../../help/Help'
import { t } from '../../i18n/t'
import { TrashSection } from '../../trash/TrashSection'
import { SyncDot } from '../../sync/SyncDot'
import { Icon } from '../tools/icons'

const LayerGallery = lazy(() =>
  import('../../layers/LayerGallery').then((m) => ({
    default: m.LayerGallery,
  })),
)

/**
 * The quiet corner (⚙ at the bottom of the strip): the things you use now
 * and then, out of the way. Settings, Save & restore, Trash, Theme, Device
 * mode and Help. It stays open while you use Trash or the theme buttons and
 * closes on Esc, a tap outside, or choosing Settings, Save & restore or Help.
 */
export function QuietCorner({
  db,
  workspaceId,
  theme,
  onThemeChange,
  settingsOpen,
  dataOpen,
  onOpenSettings,
  onOpenData,
  onOpenHelp,
}: {
  db: LearningNotesDB
  workspaceId: string
  theme: Theme
  onThemeChange: (theme: Theme) => void
  settingsOpen: boolean
  dataOpen: boolean
  onOpenSettings: () => void
  onOpenData: () => void
  onOpenHelp: () => void
}) {
  const [open, setOpen] = useState(false)
  const [layers, setLayers] = useState(false)
  const button = useRef<HTMLButtonElement>(null)
  const panel = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      // A list opened from here (Device mode) closes first.
      if (document.querySelector('[role="menu"]')) return
      e.stopPropagation()
      setOpen(false)
      button.current?.focus()
    }
    const onDown = (e: PointerEvent) => {
      const target = e.target as Element | null
      if (
        target?.closest('[data-corner], [role="menu"], [data-popup]') ||
        button.current?.contains(target)
      )
        return
      setOpen(false)
    }
    window.addEventListener('keydown', onKey, true)
    window.addEventListener('pointerdown', onDown, true)
    return () => {
      window.removeEventListener('keydown', onKey, true)
      window.removeEventListener('pointerdown', onDown, true)
    }
  }, [open])

  useEffect(() => {
    if (open) panel.current?.querySelector('button')?.focus()
  }, [open])

  // BUG-006: the panel rises from the foot of what can be SEEN.
  const lift = useFootLift()

  const choose = (run: () => void) => () => {
    setOpen(false)
    run()
  }
  const row =
    'flex min-h-11 w-full items-center gap-2 rounded-lg px-2.5 text-left text-sm hover:bg-hover'

  return (
    <>
      <Tip id="sidebar.corner" className="flex" touchInfo={false}>
        <button
          ref={button}
          data-testid="corner-button"
          type="button"
          aria-label={t('corner.label')}
          aria-haspopup="true"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
          className="grid size-11 place-items-center rounded-xl text-ink-soft hover:bg-hover hover:text-ink aria-expanded:bg-hover"
        >
          <Settings aria-hidden size={21} strokeWidth={1.75} />
        </button>
      </Tip>
      {open &&
        createPortal(
          <div
            ref={panel}
            data-corner
            style={{ marginBottom: lift }}
            data-testid="corner-panel"
            role="region"
            aria-label={t('corner.label')}
            className="fixed bottom-2 left-14 z-50 flex max-h-[80vh] w-64 flex-col gap-0.5 overflow-y-auto glass rounded-xl p-2 text-ink phone:right-2 phone:bottom-16 phone:left-auto"
          >
            <Tip id="sidebar.settings" className="flex" touchInfo={false}>
              <button
                type="button"
                onClick={choose(onOpenSettings)}
                aria-current={settingsOpen ? 'page' : undefined}
                className={`${row} ${settingsOpen ? 'bg-hover font-semibold' : ''}`}
              >
                <span aria-hidden className="text-muted">
                  <Icon name="settings" size={18} />
                </span>
                {t('settings.title')}
                <SyncDot className="ms-auto" />
              </button>
            </Tip>
            <Tip id="sidebar.data" className="flex" touchInfo={false}>
              <button
                type="button"
                onClick={choose(onOpenData)}
                aria-current={dataOpen ? 'page' : undefined}
                className={`${row} ${dataOpen ? 'bg-hover font-semibold' : ''}`}
              >
                <span aria-hidden className="text-muted">
                  ⤓
                </span>
                {t('sidebar.data')}
              </button>
            </Tip>
            <div className="px-0.5">
              <TrashSection db={db} workspaceId={workspaceId} />
            </div>
            <DeviceModeMenuRow className={row} />
            <button
              type="button"
              data-testid="layer-gallery-open"
              onClick={choose(() => setLayers(true))}
              className={row}
            >
              <span aria-hidden className="text-muted">
                ◫
              </span>
              {t('layers.open')}
            </button>
            <button
              type="button"
              data-testid="refresh-app"
              onClick={choose(() => {
                void import('../softRefresh').then((m) => m.refreshNow())
              })}
              className={row}
            >
              <span aria-hidden className="text-muted">
                ↻
              </span>
              {t('refresh.app')}
            </button>
            <button type="button" onClick={choose(onOpenHelp)} className={row}>
              <span aria-hidden className="text-muted">
                ?
              </span>
              {t('corner.help')}
            </button>
            <Tip id="sidebar.theme" className="flex" touchInfo={false}>
              <div
                role="group"
                aria-label={t('sidebar.theme.label')}
                className="flex flex-1 gap-1.5 p-2"
              >
                {THEMES.map((name) => (
                  <button
                    key={name}
                    type="button"
                    aria-pressed={theme === name}
                    onClick={() => onThemeChange(name)}
                    className={`min-h-9 flex-1 rounded-lg border bg-bg p-1.5 text-xs transition-colors ${
                      theme === name
                        ? 'border-accent text-accent'
                        : 'border-line text-ink'
                    }`}
                  >
                    {t(`theme.${name}`)}
                  </button>
                ))}
              </div>
            </Tip>
          </div>,
          document.body,
        )}
      {layers &&
        createPortal(
          <Suspense fallback={null}>
            <LayerGallery
              db={db}
              workspaceId={workspaceId}
              onClose={() => setLayers(false)}
            />
          </Suspense>,
          document.body,
        )}
    </>
  )
}
