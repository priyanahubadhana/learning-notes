import { useRef, useState } from 'react'
import { ToolFrame, type ToolAction } from '../parts/ToolFrame'
import type { WizardStep } from '../parts/wizardLogic'
import '../parts/Dialogs.css'
import { Demo, Section } from './Bits'
import './Step3.css'

const T = {
  title: 'Tool frame',
  help: 'The full-screen workbench: steps on top, a big preview, ✕ and ✓ at the bottom.',
  editPicture: 'Edit picture',
  scanPage: 'Scan a page',
  openClean: 'Open: nothing changed',
  openDirty: 'Open: with changes',
  openSteps: 'Open: with steps',
  openTools: 'Open: many tools (… folds)',
  openNotReady: 'Open: Done is off',
  openBusy: 'Open: busy with %',
  openBusyPlain: 'Open: busy, no %',
  openError: 'Open: error',
  inline: 'Phone shape (inline)',
  brighten: 'Brighten',
  contrast: 'Contrast',
  rotate: 'Rotate',
  flip: 'Flip',
  crop: 'Crop',
  sharpen: 'Sharpen',
  blur: 'Blur',
  tint: 'Tint',
  warm: 'Warm',
  cool: 'Cool',
  fade: 'Fade',
  shape: 'Shape',
  square: 'Square',
  round: 'Round',
  pickFirst: 'Pick a picture first.',
  reading: 'Reading the text…',
  failed: 'Could not read this page.',
  pageSteps: 'Page history steps',
  lastCloseLabel: 'Last close',
  noneYet: 'nothing yet',
  pageUndo: 'Undo on the page',
  dragMe: 'Drag the dot. Nothing is drawn or selected here.',
  next: 'Next',
  stopped: 'stopped, nothing kept',
} as const

type Variant =
  | 'clean'
  | 'dirty'
  | 'steps'
  | 'tools'
  | 'notready'
  | 'busy'
  | 'busyplain'
  | 'error'

const STEPS: WizardStep[] = [
  { id: 'a', label: 'Pick' },
  { id: 'b', label: 'Adjust' },
  { id: 'c', label: 'Check' },
]

type Look = { n: number; x: number; y: number }

/** One demo tool: every press is one step of the tool's own history. */
function Demo3({
  variant,
  opener,
  mode = 'floating',
  onLeave,
  onResult,
}: {
  variant: Variant
  opener?: HTMLElement | null
  mode?: 'floating' | 'inline'
  onLeave(how: string): void
  onResult(steps: number): void
}) {
  const [done, setDone] = useState<Look[]>([])
  const [redo, setRedo] = useState<Look[]>([])
  const [step, setStep] = useState('b')
  const [busy, setBusy] = useState(
    variant === 'busy' || variant === 'busyplain',
  )
  const [err, setErr] = useState(variant === 'error')
  const drag = useRef<{ x: number; y: number } | null>(null)
  const cur: Look = done[done.length - 1] ?? { n: 0, x: 50, y: 50 }
  const push = (l: Look) => {
    setDone((d) => [...d, l])
    setRedo([])
  }
  const bump = () => push({ ...cur, n: (cur.n + 1) % 3 })

  const tools: ToolAction[] = [
    { id: 'brighten', icon: 'sun', label: T.brighten, onPress: bump },
    { id: 'contrast', icon: 'circle', label: T.contrast, onPress: bump },
    {
      id: 'shape',
      icon: 'square',
      label: T.shape,
      options: (
        <div className="tfd-opts">
          <button type="button" className="fb-btn" onClick={bump}>
            {T.square}
          </button>
          <button type="button" className="fb-btn" onClick={bump}>
            {T.round}
          </button>
        </div>
      ),
    },
    ...(variant === 'tools'
      ? ([
          { id: 'rotate', icon: 'rotate', label: T.rotate, onPress: bump },
          { id: 'flip', icon: 'swap', label: T.flip, onPress: bump },
          { id: 'crop', icon: 'scissors', label: T.crop, onPress: bump },
          { id: 'sharpen', icon: 'focus', label: T.sharpen, onPress: bump },
          { id: 'blur', icon: 'droplet', label: T.blur, onPress: bump },
          { id: 'tint', icon: 'palette', label: T.tint, onPress: bump },
          { id: 'warm', icon: 'sunrise', label: T.warm, onPress: bump },
          { id: 'cool', icon: 'droplet', label: T.cool, onPress: bump },
          { id: 'fade', icon: 'star', label: T.fade, onPress: bump },
        ] as ToolAction[])
      : []),
  ]

  const onDown = (e: React.PointerEvent) => {
    try {
      ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    } catch {
      // a synthetic pointer has no capture; the drag still follows the events
    }
    drag.current = { x: e.clientX, y: e.clientY }
  }
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current
    if (!d) return
    const box = (
      e.currentTarget.parentElement as HTMLElement
    ).getBoundingClientRect()
    const x = Math.min(
      95,
      Math.max(5, ((e.clientX - box.left) / box.width) * 100),
    )
    const y = Math.min(
      95,
      Math.max(5, ((e.clientY - box.top) / box.height) * 100),
    )
    liveRef.current = { ...cur, x, y }
    setLive(liveRef.current)
  }
  const [liveLook, setLive] = useState<Look | null>(null)
  const liveRef = useRef<Look | null>(null)
  const shown = liveLook ?? cur
  const onUp = () => {
    if (!drag.current) return
    drag.current = null
    if (liveRef.current) push(liveRef.current)
    liveRef.current = null
    setLive(null)
  }

  const notReady = variant === 'notready'
  const hint = notReady ? T.pickFirst : undefined
  return (
    <ToolFrame
      mode={mode}
      opener={opener}
      title={variant === 'steps' ? T.scanPage : T.editPicture}
      steps={variant === 'steps' ? STEPS : undefined}
      step={variant === 'steps' ? step : undefined}
      onStep={setStep}
      preview={
        <div className="tfd-pic" data-testid="tfd-pic" data-look={shown.n}>
          <p>{T.dragMe}</p>
          <i
            className="tfd-handle"
            data-testid="tfd-handle"
            style={{ left: `${shown.x}%`, top: `${shown.y}%` }}
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={onUp}
          />
        </div>
      }
      tools={tools}
      history={{
        canUndo: done.length > 0,
        canRedo: redo.length > 0,
        undo: () => {
          setRedo((r) => [done[done.length - 1], ...r])
          setDone((d) => d.slice(0, -1))
        },
        redo: () => {
          setDone((d) => [...d, redo[0]])
          setRedo((r) => r.slice(1))
        },
      }}
      dirty={done.length > 0}
      canDone={!notReady && !err}
      doneLabel={variant === 'steps' && step !== 'c' ? T.next : undefined}
      busy={
        busy
          ? {
              label: T.reading,
              progress: variant === 'busy' ? 0.4 : undefined,
              onCancel: () => {
                setBusy(false)
                onLeave(T.stopped)
              },
            }
          : undefined
      }
      error={err ? { text: T.failed, onRetry: () => setErr(false) } : undefined}
      hint={hint}
      onDone={() => {
        if (variant === 'steps' && step !== 'c') {
          setStep(step === 'a' ? 'b' : 'c')
          return
        }
        onResult(1)
        onLeave('done')
      }}
      onClose={(r) => onLeave(r)}
      data-testid={mode === 'inline' ? 'tool-frame-inline' : 'tool-frame'}
    />
  )
}

const BUTTONS: [Variant, string][] = [
  ['clean', T.openClean],
  ['dirty', T.openDirty],
  ['steps', T.openSteps],
  ['tools', T.openTools],
  ['notready', T.openNotReady],
  ['busy', T.openBusy],
  ['busyplain', T.openBusyPlain],
  ['error', T.openError],
]

export default function ToolFrameSection() {
  const [open, setOpen] = useState<Variant | null>(null)
  const [openerEl, setOpenerEl] = useState<HTMLElement | null>(null)
  const [last, setLast] = useState<string>(T.noneYet)
  const [page, setPage] = useState(0)
  return (
    <Section id="toolframe" title={T.title} help={T.help}>
      <div className="step3-row">
        {BUTTONS.map(([v, label]) => (
          <button
            key={v}
            type="button"
            className="fb-btn"
            data-testid={`tf-open-${v}`}
            onClick={(e) => {
              setOpenerEl(e.currentTarget)
              setOpen(v)
            }}
          >
            {label}
          </button>
        ))}
      </div>
      <p className="step3-said" data-testid="tf-last" aria-live="polite">
        {T.lastCloseLabel}: {last}
      </p>
      <div className="step3-row">
        <p className="step3-said" data-testid="tf-page-steps">
          {T.pageSteps}: {page}
        </p>
        <button
          type="button"
          className="fb-btn"
          data-testid="tf-page-undo"
          disabled={page === 0}
          onClick={() => setPage((p) => Math.max(0, p - 1))}
        >
          {T.pageUndo}
        </button>
      </div>
      {open ? (
        <Demo3
          key={open}
          variant={open}
          opener={openerEl}
          onLeave={(how) => {
            setLast(how)
            setOpen(null)
          }}
          onResult={(n) => setPage((p) => p + n)}
        />
      ) : null}
      <Demo state="tf-inline" label={T.inline}>
        <div className="step3-inline">
          <Demo3
            variant="steps"
            mode="inline"
            onLeave={() => {}}
            onResult={() => {}}
          />
        </div>
      </Demo>
    </Section>
  )
}
