import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent as RKeyboardEvent,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { Icon, type IconName } from '../../app/tools/icons'
import { overlay } from '../../app/overlay'
import { setPillEnv } from '../../app/overlay/pillEnv'
import { useVisualViewportBox } from '../../app/overlay/visualViewport'
import '../../app/overlay/stepLayers.css'
import { Card } from './Card'
import { CompareButton } from './CompareButton'
import { ConfirmDialog } from './Dialogs'
import { motionMs } from './motion'
import { tp3 } from './tp3'
import { usePhone } from './useAnchoredCard'
import { WizardSteps, type WizardStep } from './WizardSteps'
import {
  closeAction,
  isTypingTarget,
  progressMark,
  visibleToolCount,
} from './toolFrameLogic'
import './Dialogs.css'
import './ToolFrame.css'

export type ToolAction = {
  id: string
  icon: IconName
  label: string
  onPress?(): void
  /** A tool with choices carries a ▾ and opens this as a card above the row. */
  options?: ReactNode
  disabled?: boolean
  pressed?: boolean
}

export type ToolFrameProps = {
  title: string
  steps?: WizardStep[]
  step?: string
  onStep?(id: string): void
  /** Used by the strip's default rule: may the person go to the next step? */
  stepValid?: boolean
  preview: ReactNode
  tools?: ToolAction[]
  compare?: {
    label?: string
    onShow(on: boolean): void
    /** Why there is no original; the button is disabled and says it. */
    disabledReason?: string
  }
  history?: { canUndo: boolean; canRedo: boolean; undo(): void; redo(): void }
  /** ✕ asks "Discard changes?" only when true. */
  dirty: boolean
  canDone: boolean
  doneLabel?: string
  busy?: { label: string; progress?: number; onCancel?(): void }
  /** One muted line in the footer (also the reason ✓ is off). */
  hint?: string
  error?: { text: string; onRetry(): void }
  /** The whole result = ONE history step on the page. */
  onDone(): void
  onClose(reason: 'x' | 'esc'): void
  opener?: HTMLElement | null
  /** `inline` draws the frame in a box (gallery phone / small demos); no overlay, no trap. */
  mode?: 'floating' | 'inline'
  id?: string
  'data-testid'?: string
}

const OUT_MS = 180
const FOOTER_PX = 64
const TOOL_GAP = 4
const PHONE_TOOLS = 5

/**
 * Tool frame (S3-01 to S3-12): the full-screen workbench for a job with a
 * result. 52 px top bar, a preview with 16 px margins, an optional tools row,
 * a 64 px footer with ✕ on the left and ✓ on the right. One at a time, at
 * `--z-tool`; cards, dialogs and toasts open above it.
 */
export function ToolFrame(props: ToolFrameProps) {
  const {
    title,
    steps,
    step,
    preview,
    tools = [],
    compare,
    history,
    canDone,
    busy,
    hint,
    error,
    mode = 'floating',
  } = props
  const autoId = useId()
  const id = props.id ?? `toolframe-${autoId}`
  const ref = useRef<HTMLDivElement | null>(null)
  const rowRef = useRef<HTMLDivElement | null>(null)
  const measureRef = useRef<HTMLDivElement | null>(null)
  const phone = usePhone()
  const [asking, setAsking] = useState<null | 'x' | 'esc'>(null)
  const [epoch, setEpoch] = useState(0)
  const [closing, setClosing] = useState(false)
  const [openTool, setOpenTool] = useState<string | null>(null)
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)
  const [visible, setVisible] = useState<number | null>(null)
  const [said, setSaid] = useState('')
  const lastMark = useRef(0)
  const openerRef = useRef<HTMLElement | null>(null)
  const live = useRef(true)

  // Latest props for callbacks the overlay manager keeps.
  const latest = useRef(props)
  useLayoutEffect(() => {
    latest.current = props
  })

  const finish = useCallback((reason: 'x' | 'esc') => {
    const ms = motionMs(OUT_MS)
    setClosing(true)
    const run = () => {
      if (live.current) latest.current.onClose(reason)
    }
    if (ms === 0) run()
    else setTimeout(run, ms)
  }, [])

  /** ✕ / Esc: the close rule in toolFrameLogic.ts. */
  const requestClose = useCallback(
    (reason: 'x' | 'esc') => {
      const p = latest.current
      const act = closeAction({
        dirty: p.dirty,
        busy: !!p.busy,
        canStop: !!p.busy?.onCancel,
      })
      if (act === 'close') finish(reason)
      else if (act === 'ask') setAsking(reason)
      else if (act === 'stop') p.busy?.onCancel?.()
    },
    [finish],
  )

  // Overlay manager: Esc, layer order, and "everything outside is a child
  // overlay" (cards, dialogs, toasts open above and stay).
  useEffect(() => {
    if (mode !== 'floating') return
    const el = ref.current
    if (!el) return
    live.current = true
    const opener =
      props.opener ??
      openerRef.current ??
      (document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null)
    openerRef.current = opener
    const handle = overlay.open({
      id,
      layer: 'bar',
      close: () => {
        if (!live.current) return
        requestClose('esc')
        // the manager dropped this entry; take the place back unless we closed
        if (live.current) setEpoch((n) => n + 1)
      },
      inside: () => true,
      swallowOutsideTap: false,
      opener,
    })
    if (epoch === 0) {
      const first =
        el.querySelector<HTMLElement>('[data-autofocus]') ??
        el.querySelector<HTMLElement>('.tf-tool:not([disabled])') ??
        el.querySelector<HTMLElement>(
          '.tf-preview [tabindex], .tf-preview button, .tf-preview input',
        )
      ;(first ?? el).focus()
    }
    return () => {
      live.current = false
      handle.close()
    }
  }, [mode, id, epoch, props.opener, requestClose])

  // Focus goes back to the opener once, when the frame leaves.
  useEffect(() => {
    if (mode !== 'floating') return
    const opener = openerRef.current
    return () => opener?.focus()
  }, [mode])

  // The footer keeps above the on-screen keyboard (S3-11): follow the visual viewport.
  const { box, keyboard } = useVisualViewportBox(mode === 'floating')
  useEffect(() => {
    if (mode === 'floating') setPillEnv({ keyboard })
  }, [mode, keyboard])
  useEffect(() => {
    if (mode !== 'floating') return
    setPillEnv({ toolFooter: FOOTER_PX })
    return () => setPillEnv({ toolFooter: 0, keyboard: 0 })
  }, [mode])

  // Fold the tools that do not fit into "…" (S3-09): measure the natural
  // widths in a hidden copy, then count what fits the row.
  const toolKey = tools.map((t) => `${t.id}:${t.label}`).join('|')
  useLayoutEffect(() => {
    const row = rowRef.current
    const meas = measureRef.current
    if (!row || !meas) return
    const fit = () => {
      const widths = Array.from(
        meas.querySelectorAll<HTMLElement>('.tf-tool'),
      ).map((b) => b.offsetWidth)
      const cs = getComputedStyle(row)
      const avail =
        row.clientWidth -
        parseFloat(cs.paddingLeft) -
        parseFloat(cs.paddingRight)
      if (!avail || widths.some((w) => !w)) {
        setVisible(null)
        return
      }
      setVisible(
        visibleToolCount(
          widths,
          avail,
          TOOL_GAP,
          44,
          phone ? PHONE_TOOLS : Infinity,
        ),
      )
    }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(row)
    return () => ro.disconnect()
  }, [toolKey, phone])

  // Busy progress is announced at 25 / 50 / 75 / 100 only (S3-08).
  const pct =
    busy?.progress !== undefined ? Math.round(busy.progress * 100) : -1
  useEffect(() => {
    if (!busy) {
      lastMark.current = 0
      return
    }
    if (pct < 0) return
    const m = progressMark(pct, lastMark.current)
    if (m !== null) {
      lastMark.current = m
      setSaid(tp3('parts.tool.progress', { label: busy.label, pct: m }))
    }
  }, [pct, busy])

  const onKeyDown = (e: RKeyboardEvent<HTMLDivElement>) => {
    const el = ref.current
    if (!el || !el.contains(e.target as Node)) return // from a card or dialog above
    if (e.key === 'Tab' && mode === 'floating') {
      const list = Array.from(
        el.querySelectorAll<HTMLElement>(
          'button:not([disabled]),input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])',
        ),
      ).filter((n) => !n.closest('[inert]') && !n.closest('[hidden]'))
      if (!list.length) return
      const at = list.indexOf(document.activeElement as HTMLElement)
      if (e.shiftKey && at <= 0) {
        e.preventDefault()
        list[list.length - 1].focus()
      } else if (!e.shiftKey && at === list.length - 1) {
        e.preventDefault()
        list[0].focus()
      }
      return
    }
    if (isTypingTarget(e.target)) return
    const mod = e.ctrlKey || e.metaKey
    if (mod && history && (e.key === 'z' || e.key === 'Z')) {
      e.preventDefault()
      if (e.shiftKey) {
        if (history.canRedo) history.redo()
      } else if (history.canUndo) history.undo()
    } else if (mod && history && (e.key === 'y' || e.key === 'Y')) {
      e.preventDefault()
      if (history.canRedo) history.redo()
    } else if (
      e.key === 'Enter' &&
      (e.target as HTMLElement).tagName !== 'BUTTON' &&
      canDone &&
      !busy
    ) {
      e.preventDefault()
      props.onDone()
    }
  }

  const shown = visible === null ? tools.length : visible
  const rowTools = tools.slice(0, shown)
  const folded = tools.slice(shown)
  const stepsOn = steps && steps.length > 1 && step
  const doneLabel = props.doneLabel ?? tp3('parts.tool.done')
  const stopLabel = tp3('parts.tool.stop')
  const cancelLabel = busy?.onCancel ? stopLabel : tp3('parts.tool.cancel')
  const openT = tools.find((t) => t.id === openTool)

  const toolButton = (t: ToolAction, inRow: boolean) => (
    <button
      key={t.id}
      type="button"
      className="tf-tool"
      data-testid={inRow ? `tf-tool-${t.id}` : undefined}
      disabled={t.disabled || !!busy}
      aria-pressed={t.pressed}
      aria-haspopup={t.options ? 'dialog' : undefined}
      aria-expanded={t.options ? openTool === t.id : undefined}
      onClick={(e) => {
        if (t.options) {
          setAnchor(e.currentTarget)
          setOpenTool((cur) => (cur === t.id ? null : t.id))
        } else t.onPress?.()
      }}
    >
      <Icon name={t.icon} size={20} />
      <span className="tf-tool-label">
        {t.label}
        {t.options ? (
          <Icon name="chevronDown" size={12} className="tf-tool-caret" />
        ) : null}
      </span>
    </button>
  )

  const frame = (
    <div
      ref={ref}
      className="tf"
      data-steps={stepsOn ? '' : undefined}
      data-mode={mode}
      data-closing={closing ? '' : undefined}
      data-busy={busy ? '' : undefined}
      data-testid={props['data-testid'] ?? 'tool-frame'}
      role="dialog"
      aria-modal={mode === 'floating' ? 'true' : undefined}
      aria-label={title}
      tabIndex={-1}
      style={box ? { top: box.top, height: box.height } : undefined}
      onKeyDown={onKeyDown}
    >
      <header className="tf-top">
        <h2 className="tf-title">{title}</h2>
        {stepsOn ? (
          <div className="tf-steps">
            <WizardSteps
              steps={steps}
              value={step}
              valid={props.stepValid}
              onChange={(sid) => props.onStep?.(sid)}
            />
          </div>
        ) : (
          <span className="tf-steps" />
        )}
        <div className="tf-top-end">
          {history ? (
            <>
              <button
                type="button"
                className="tf-icon"
                aria-label={tp3('parts.tool.undo')}
                data-testid="tf-undo"
                disabled={!history.canUndo || !!busy}
                onClick={history.undo}
              >
                <Icon name="undo" size={18} />
              </button>
              <button
                type="button"
                className="tf-icon"
                aria-label={tp3('parts.tool.redo')}
                data-testid="tf-redo"
                disabled={!history.canRedo || !!busy}
                onClick={history.redo}
              >
                <Icon name="redo" size={18} />
              </button>
            </>
          ) : null}
          {compare ? (
            <CompareButton
              label={compare.label}
              onShow={compare.onShow}
              disabledReason={compare.disabledReason}
            />
          ) : null}
        </div>
      </header>

      <div
        className="tf-preview"
        role="region"
        aria-label={tp3('parts.tool.preview')}
        tabIndex={0}
        data-testid="tf-preview"
      >
        {preview}
      </div>

      {tools.length ? (
        <>
          <div
            className="tf-tools"
            role="toolbar"
            aria-label={tp3('parts.tool.tools')}
            ref={rowRef}
            data-testid="tf-tools"
          >
            {rowTools.map((t) => toolButton(t, true))}
            {folded.length ? (
              <button
                type="button"
                className="tf-tool tf-more"
                data-testid="tf-more"
                aria-label={tp3('parts.tool.more')}
                aria-haspopup="dialog"
                aria-expanded={openTool === '…'}
                disabled={!!busy}
                onClick={(e) => {
                  setAnchor(e.currentTarget)
                  setOpenTool((cur) => (cur === '…' ? null : '…'))
                }}
              >
                <Icon name="more" size={20} />
              </button>
            ) : null}
          </div>
          <div
            className="tf-measure"
            ref={measureRef}
            aria-hidden="true"
            inert={true}
          >
            {tools.map((t) => (
              <span key={t.id} className="tf-tool">
                <Icon name={t.icon} size={20} />
                <span className="tf-tool-label">
                  {t.label}
                  {t.options ? <Icon name="chevronDown" size={12} /> : null}
                </span>
              </span>
            ))}
          </div>
        </>
      ) : null}

      <footer className="tf-foot">
        <button
          type="button"
          className="tf-btn tf-cancel"
          data-testid="tf-cancel"
          aria-label={cancelLabel}
          onClick={() => requestClose('x')}
        >
          <Icon name={busy?.onCancel ? 'square' : 'close'} size={18} />
          <span className="tf-btn-word">{cancelLabel}</span>
        </button>
        <div className="tf-mid" data-testid="tf-mid">
          {busy ? (
            <div className="tf-busy">
              <span className="tf-busy-label">
                {pct >= 0
                  ? tp3('parts.tool.progress', { label: busy.label, pct })
                  : busy.label}
              </span>
              <span
                className="tf-track"
                role="progressbar"
                aria-label={tp3('parts.tool.progressName')}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={pct >= 0 ? pct : undefined}
                data-indeterminate={pct < 0 ? '' : undefined}
              >
                <span
                  className="tf-track-fill"
                  style={pct >= 0 ? { width: `${pct}%` } : undefined}
                />
              </span>
            </div>
          ) : error ? (
            <div className="tf-error" role="alert">
              <Icon name="circle" size={14} />
              <span>{error.text}</span>
              <button type="button" className="tf-link" onClick={error.onRetry}>
                {tp3('parts.tool.tryAgain')}
              </button>
            </div>
          ) : hint || compare?.disabledReason ? (
            <p className="tf-hint" data-testid="tf-hint">
              {hint ?? compare?.disabledReason}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          className="tf-btn tf-ok"
          data-testid="tf-done"
          aria-label={doneLabel}
          disabled={!canDone || !!busy}
          aria-busy={busy ? true : undefined}
          onClick={props.onDone}
        >
          {busy ? (
            <span className="tf-spin" aria-hidden="true" />
          ) : (
            <Icon name="check" size={18} />
          )}
          <span className="tf-btn-word">{doneLabel}</span>
        </button>
      </footer>
      <span className="tf-sr" role="status" aria-live="polite">
        {said}
      </span>

      {openT?.options ? (
        <Card
          anchor={anchor}
          size="pick"
          prefer="above"
          title={openT.label}
          onClose={() => setOpenTool(null)}
          testId="tf-card"
        >
          {openT.options}
        </Card>
      ) : null}
      {openTool === '…' ? (
        <Card
          anchor={anchor}
          size="pick"
          prefer="above"
          title={tp3('parts.tool.more')}
          onClose={() => setOpenTool(null)}
          testId="tf-more-card"
        >
          <div className="tf-fold">
            {folded.map((t) => (
              <button
                key={t.id}
                type="button"
                className="tf-fold-item"
                disabled={t.disabled}
                onClick={() => {
                  if (t.options) setOpenTool(t.id)
                  else {
                    setOpenTool(null)
                    t.onPress?.()
                  }
                }}
              >
                <Icon name={t.icon} size={18} />
                <span>{t.label}</span>
              </button>
            ))}
          </div>
        </Card>
      ) : null}
      {asking ? (
        <ConfirmDialog
          title={tp3('parts.tool.discardTitle')}
          text={tp3('parts.tool.discardText')}
          confirmLabel={tp3('parts.tool.discard')}
          cancelLabel={tp3('parts.tool.cancel')}
          danger
          onConfirm={() => {
            const r = asking
            setAsking(null)
            finish(r)
          }}
          onCancel={() => setAsking(null)}
        />
      ) : null}
    </div>
  )
  return mode === 'inline' ? frame : createPortal(frame, document.body)
}
