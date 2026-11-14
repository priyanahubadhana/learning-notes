import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useMemo, useRef, useState } from 'react'
import { onRouted } from '../../input/eventRouter'
import { overlay } from '../../overlay'
import { usePref } from '../../usePref'
import { Icon } from '../../tools/icons'
import type { LearningNotesDB } from '../../../core/db'
import { TabRow, type TabDef } from '../../../design/parts/TabRow'
import { displayName, sampleName } from '../../../i18n/defaultNames'
import { t } from '../../../i18n/t'
import { outlineRequest } from '../outlineRequest'
import { OutlineTabV2 } from './OutlineTabV2'
import { PagesTabV2 } from './PagesTabV2'
import { ResourcesTab } from './ResourcesTab'
import { ScrollBarIn } from '../../../design/parts/ScrollBar'
import { useFrameSize } from '../../shell/useFrameSize'
import './panelV2.css'

const TABS = ['pages', 'outline', 'resources'] as const
type Tab = (typeof TABS)[number]
/** The browser's top layer, where it exists (the drawer is not a manager overlay). */
const popoverAttr = (): 'manual' | undefined =>
  typeof HTMLElement !== 'undefined' && 'showPopover' in HTMLElement.prototype
    ? 'manual'
    : undefined
function showTop(el: HTMLElement | null) {
  try {
    ;(
      el as (HTMLElement & { showPopover?: () => void }) | null
    )?.showPopover?.()
  } catch {
    /* already open or not supported */
  }
}

/** `audio` is what an older version stored: recordings are a kind of Resource now. */
const isTab = (v: unknown): v is Tab | 'audio' =>
  v === 'audio' || TABS.includes(v as Tab)

/** Screens at least this wide dock the panel beside the page; narrower ones slide it over. */
const DOCK_MIN = 1024

function useDocked(): boolean {
  return useFrameSize().width >= DOCK_MIN
}

/**
 * The left panel of the new Notebooks screens (flag `notebooks.v2`, spec
 * NB-B40..B52): 264 px, tabs Pages · Outline · Resources in the shared Tab
 * row, ✕ at the top. Docked beside the page on wide screens; on narrower
 * ones a left drawer (86 vw on a phone) over a scrim.
 */
export default function PanelV2({
  db,
  notebookId,
  pageId,
  onOpenPage,
  onClose,
}: {
  db: LearningNotesDB
  notebookId: string
  pageId: string
  onOpenPage: (id: string) => void
  onClose: () => void
}) {
  const docked = useDocked()
  const [body, setBody] = useState<HTMLElement | null>(null)
  const [stored, setTab] = usePref<Tab | 'audio'>(
    'leftPanel.tab',
    isTab,
    'pages',
  )
  const tab: Tab = stored === 'audio' ? 'resources' : stored
  const ask = outlineRequest.useValue()
  useEffect(() => {
    if (ask.n > 0 && Date.now() - ask.at < 1500)
      setTab(ask.tab === 'audio' ? 'resources' : 'outline')
  }, [ask, setTab])

  const notebook = useLiveQuery(
    () => db.notebooks.get(notebookId),
    [db, notebookId],
  )
  const title = notebook
    ? displayName(sampleName(notebook)) || t('review.untitled')
    : ''

  const catalog = useMemo<TabDef[]>(
    () => [
      { id: 'pages', label: t('lp2.tab.pages') },
      { id: 'outline', label: t('lp2.tab.outline') },
      { id: 'resources', label: t('lp2.tab.resources') },
    ],
    [],
  )

  const layerRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef(onClose)
  useEffect(() => {
    closeRef.current = onClose
  })
  // The drawer sits in the top layer. It is not an overlay of the manager (a
  // finger held on a thumbnail must still open the strip), so its Esc and the
  // tap on the scrim are its own; anything open on top of it takes Esc first.
  useEffect(() => {
    if (docked) return
    showTop(layerRef.current)
    return onRouted(
      'keydown',
      (e) => {
        if (e.key === 'Escape' && overlay.count() === 0) closeRef.current()
      },
      { name: 'left-panel-esc' },
    )
  }, [docked])

  const open = (id: string) => {
    onOpenPage(id)
    if (!docked) onClose()
  }
  const common = { db, notebookId, pageId }

  const panel = (
    <aside
      className="lpv2"
      data-mode={docked ? 'docked' : 'over'}
      data-testid="left-panel"
      data-palm-guard
      data-chrome
      aria-label={t('lp2.label')}
    >
      <header className="lpv2-head">
        <h2 title={title}>{title}</h2>
        <button
          type="button"
          className="lpv2-x"
          data-testid="lpv2-close"
          aria-label={t('lp2.close')}
          onClick={onClose}
        >
          <Icon name="close" size={18} />
        </button>
      </header>
      <div className="lpv2-tabs">
        <TabRow
          setKey="leftPanel"
          catalog={catalog}
          defaults={[...TABS]}
          value={tab}
          variant="underline"
          label={t('lp2.tabs')}
          onPick={(id) => {
            if (TABS.includes(id as Tab)) setTab(id as Tab)
          }}
        />
      </div>
      <div role="tabpanel" className="lpv2-body" data-tab={tab} ref={setBody}>
        {tab === 'pages' && <PagesTabV2 {...common} onOpenPage={open} />}
        {tab === 'outline' && <OutlineTabV2 {...common} onOpenPage={open} />}
        {tab === 'resources' && <ResourcesTab {...common} onOpenPage={open} />}
      </div>
      <ScrollBarIn root={body} selector=".lpv2-scroll" />
    </aside>
  )
  if (docked) return panel
  return (
    <div
      ref={layerRef}
      className="lpv2-layer"
      popover={popoverAttr()}
      data-testid="lpv2-layer"
    >
      <div
        className="lpv2-scrim"
        data-testid="lpv2-scrim"
        aria-hidden="true"
        onPointerDown={onClose}
      />
      {panel}
    </div>
  )
}
