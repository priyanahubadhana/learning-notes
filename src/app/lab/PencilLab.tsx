import { useEffect, useRef, useState } from 'react'
import type { LearningNotesDB } from '../../core/db'
import { createBlock } from '../../core/blockService'
import { listNotebooks } from '../../notebooks/notebookService'
import { createPage, getPage } from '../../pages/pageService'
import { pageMode, policyEnabled } from '../../editor/editPolicy'
import { inkApi, inkSwitches } from '../../ink/inkRuntime'
import { t } from '../../i18n/t'
import { penTapOptions } from '../penTap'
import { labPageId } from './labPage'
import {
  buildReport,
  newStats,
  summarize,
  watchStats,
  type LabStats,
} from './labStats'

/**
 * The Pencil lab (#/lab/pencil): the real page editor with sample text and the
 * ink overlay, and a panel that counts what the iPad sends. It exists so the
 * owner can send real numbers when Scribble misbehaves.
 */

const LAB_KEY = 'learning-notes:lab-page'

const SAMPLE = [
  'Write across this line with the Pen, the Highlighter and the Eraser.',
  'Scribble (iPad Settings > Apple Pencil) must never write letters here.',
  'Tap the bar tools with the Pencil: no comma may appear in this text.',
]

/** Finds or makes the lab page, then opens it. */
export function PencilLabEntry({
  db,
  workspaceId,
  onOpenPage,
}: {
  db: LearningNotesDB
  workspaceId: string
  onOpenPage: (pageId: string) => void
}) {
  const [failed, setFailed] = useState(false)
  const started = useRef(false)
  useEffect(() => {
    if (started.current) return
    started.current = true
    void (async () => {
      let id: string | null = null
      try {
        id = localStorage.getItem(LAB_KEY)
      } catch {
        // No storage: make a new lab page each time.
      }
      if (id && (await getPage(db, id))) {
        labPageId.set(id)
        onOpenPage(id)
        return
      }
      const notebook = (await listNotebooks(db, workspaceId))[0]
      if (!notebook) {
        setFailed(true)
        return
      }
      const page = await createPage(db, notebook.id, null, 'Pencil lab')
      for (const text of SAMPLE) {
        await createBlock(db, {
          pageId: page.id,
          type: 'paragraph',
          content: { text: [{ type: 'text', text, styles: {} }] },
        })
      }
      try {
        localStorage.setItem(LAB_KEY, page.id)
      } catch {
        // Fine: the page just is not remembered.
      }
      labPageId.set(page.id)
      onOpenPage(page.id)
    })()
  }, [db, workspaceId, onOpenPage])
  return failed ? (
    <p className="p-6 text-muted">{t('lab.needNotebook')}</p>
  ) : null
}

/** The panel over the lab page: counters, switches and Copy results. */
export function PencilLabPanel() {
  const [statsObj] = useState<LabStats>(newStats)
  const [, tick] = useState(0)
  const [open, setOpen] = useState(true)
  const [copied, setCopied] = useState(false)
  const mode = pageMode.useValue()
  const policyOn = policyEnabled.useValue()
  const [tapOn, setTapOn] = useState(penTapOptions.enabled)
  const [touchOn, setTouchOn] = useState(inkSwitches.touchCancel)

  useEffect(() => {
    let frame = 0
    const schedule = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => tick((n) => n + 1))
    }
    const off = watchStats(statsObj, schedule)
    return () => {
      off()
      cancelAnimationFrame(frame)
      penTapOptions.enabled = true
      inkSwitches.touchCancel = true
      policyEnabled.set(true)
    }
  }, [statsObj])

  const report = () =>
    buildReport(
      statsObj,
      mode,
      inkApi()?.controller.cancels ?? { kept: 0, dropped: 0 },
    )
  const copy = async () => {
    const r = report()
    const text = `${summarize(r)}\n\n${JSON.stringify(r)}`
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      window.prompt(t('lab.copyFailed'), text)
    }
  }
  const s = statsObj
  const edits = s.textEdits
  const row = 'flex justify-between gap-3 tabular-nums'
  return (
    <aside
      data-chrome
      data-lab-panel
      aria-label={t('lab.title')}
      className="fixed end-2 bottom-2 z-[45] max-h-[60vh] w-[320px] max-w-[calc(100vw-16px)] overflow-y-auto rounded-xl border border-line bg-bg p-3 text-xs shadow-lg"
    >
      <div className="flex items-center justify-between gap-2">
        <b className="text-sm">{t('lab.title')}</b>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="hit rounded-lg border border-line px-3"
        >
          {open ? t('lab.hide') : t('lab.show')}
        </button>
      </div>
      {open && (
        <div className="mt-2 grid gap-1">
          <p
            data-lab-edits
            className={edits > 0 ? 'font-bold text-danger' : ''}
          >
            {t('lab.scribbleWrote', { count: edits })}
          </p>
          <div className={row}>
            <span>{t('lab.mode')}</span>
            <b data-lab-mode>{mode}</b>
          </div>
          {Object.entries(s.pointers).map(([type, c]) => (
            <div key={type} className={row}>
              <span>{type}</span>
              <span>
                {c.down}/{c.move}({c.coalesced})/{c.up}/{c.cancel}/
                {c.lostCapture}
              </span>
            </div>
          ))}
          <div className={row}>
            <span>touchstart</span>
            <span>{JSON.stringify(s.touchstart)}</span>
          </div>
          <div className={row}>
            <span>{t('lab.hover')}</span>
            <span>{s.hoverPen}</span>
          </div>
          <div className={row}>
            <span>{t('lab.viewport')}</span>
            <span>
              {s.viewport.height} / {s.viewport.offsetTop} /{' '}
              {s.viewport.scrollY}
            </span>
          </div>
          <div className={row}>
            <span>{t('lab.focus')}</span>
            <span className="truncate">{s.focus.at(-1) ?? '-'}</span>
          </div>
          <fieldset className="mt-1 grid gap-1 border-t border-line pt-2">
            <legend className="text-muted">{t('lab.switches')}</legend>
            <Switch
              label={t('lab.sw.policy')}
              on={policyOn}
              onChange={(v) => policyEnabled.set(v)}
            />
            <Switch
              label={t('lab.sw.penTap')}
              on={tapOn}
              onChange={(v) => {
                penTapOptions.enabled = v
                setTapOn(v)
              }}
            />
            <Switch
              label={t('lab.sw.touch')}
              on={touchOn}
              onChange={(v) => {
                inkSwitches.touchCancel = v
                setTouchOn(v)
              }}
            />
          </fieldset>
          <button
            type="button"
            data-lab-copy
            onClick={() => void copy()}
            className="hit mt-1 rounded-lg border border-line px-3 font-semibold hover:bg-hover"
          >
            {copied ? t('lab.copied') : t('lab.copy')}
          </button>
        </div>
      )}
    </aside>
  )
}

function Switch({
  label,
  on,
  onChange,
}: {
  label: string
  on: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label className="hit flex items-center gap-2">
      <input
        type="checkbox"
        checked={on}
        onChange={(e) => onChange(e.target.checked)}
      />
      {label}
    </label>
  )
}
