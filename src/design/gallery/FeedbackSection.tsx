import { useEffect, useMemo, useState } from 'react'
import { AlertDialog, ConfirmDialog, PromptDialog } from '../parts/Dialogs'
import { Sheet } from '../parts/Sheet'
import { ToastStack } from '../parts/ToastStack'
import { createToasts } from '../parts/toastLogic'
import { createPartsClock } from './partsClock'
import { BannerHost } from '../parts/Banner'
import { createBannerQueue } from '../parts/bannerQueue'
import '../parts/Dialogs.css'
import { Cells, Demo, Section } from './Bits'

const T = {
  sheetDialogsToastsAnd: 'Sheet, dialogs, toasts and banner',
  openTheSheet: 'Open the sheet',
  confirm: 'Confirm',
  deleteRed: 'Delete (red)',
  alert: 'Alert',
  name: 'Name',
  done: 'Done',
  undo: 'Undo',
  problem: 'Problem',
  showABanner: 'Show a banner',
  pageSettings: 'Page settings',
  theBodyScrollsThe: 'The body scrolls. The footer stays.',
  deleteThisPage: 'Delete this page?',
  nameTheNotebook: 'Name the notebook',
  cancel: 'Cancel',
  setting: 'Setting',
  moveToAnotherNotebook: 'Move to another notebook?',
  youAreOffline: 'You are offline',
} as const

type Open = null | 'confirm' | 'danger' | 'alert' | 'prompt'

const LONG_NAME = 'A notebook name that is quite long'

function Btn({
  id,
  onClick,
  children,
}: {
  id: string
  onClick(e: React.MouseEvent<HTMLButtonElement>): void
  children: string
}) {
  return (
    <button type="button" className="fb-btn" data-testid={id} onClick={onClick}>
      {children}
    </button>
  )
}

/** Sheet, Dialog set, Toast queue and Banner (SP-50 to SP-56). */
export default function FeedbackSection() {
  const [open, setOpen] = useState<Open>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [sheetOpener, setSheetOpener] = useState<HTMLElement | null>(null)
  const [said, setSaid] = useState('Nothing chosen yet')
  const [opener, setOpener] = useState<HTMLElement | null>(null)
  // One clock for the gallery's toasts; tests reach it as window.__partsClock.
  const clock = useMemo(() => createPartsClock(), [])
  useEffect(() => {
    window.__partsClock = clock
    return () => {
      delete window.__partsClock
      clock.dispose()
    }
  }, [clock])
  const toasts = useMemo(() => createToasts(clock), [clock])
  const staticToasts = useMemo(() => {
    const t = createToasts(clock)
    t.push('done', 'Saved')
    t.push('undo', 'Page moved to Trash', () => {})
    t.push('problem', 'Could not save. Try again.')
    return t
  }, [clock])
  const banners = useMemo(() => {
    const q = createBannerQueue()
    q.push({
      id: 'b-template',
      kind: 'template',
      text: 'This is a template. Changes make a copy.',
      action: { label: 'Use it', run: () => {} },
    })
    return q
  }, [])
  const [nextBanner, setNextBanner] = useState(0)
  const showSheet = (e: React.MouseEvent<HTMLButtonElement>) => {
    setSheetOpener(e.currentTarget)
    setSheetOpen(true)
  }
  const show =
    (what: Exclude<Open, null>) => (e: React.MouseEvent<HTMLButtonElement>) => {
      setOpener(e.currentTarget)
      setOpen(what)
    }
  const close = (msg: string) => () => {
    setSaid(msg)
    setOpen(null)
  }
  const KINDS = ['backup', 'update', 'lock', 'readonly', 'journal'] as const

  return (
    <Section
      id="feedback"
      title={T.sheetDialogsToastsAnd}
      help="Press a button to open the real thing. Esc and ✕ close it."
    >
      <p className="t-small" data-testid="fb-said" aria-live="polite">
        {said}
      </p>

      <Cells>
        <Demo state="sheet" label="Sheet">
          <Btn id="fb-open-sheet" onClick={showSheet}>
            {T.openTheSheet}
          </Btn>
        </Demo>
        <Demo state="dialogs" label="Dialogs">
          <div className="flex flex-wrap gap-2">
            <Btn id="fb-open-confirm" onClick={show('confirm')}>
              {T.confirm}
            </Btn>
            <Btn id="fb-open-danger" onClick={show('danger')}>
              {T.deleteRed}
            </Btn>
            <Btn id="fb-open-alert" onClick={show('alert')}>
              {T.alert}
            </Btn>
            <Btn id="fb-open-prompt" onClick={show('prompt')}>
              {T.name}
            </Btn>
          </div>
        </Demo>
        <Demo state="toasts" label="Toasts">
          <div className="flex flex-wrap gap-2">
            <Btn
              id="fb-toast-done"
              onClick={() => toasts.push('done', 'Saved')}
            >
              {T.done}
            </Btn>
            <Btn
              id="fb-toast-undo-btn"
              onClick={() =>
                toasts.push('undo', 'Page moved to Trash', () =>
                  setSaid('Undo pressed'),
                )
              }
            >
              {T.undo}
            </Btn>
            <Btn
              id="fb-toast-problem"
              onClick={() =>
                toasts.push('problem', 'Could not save. Try again.')
              }
            >
              {T.problem}
            </Btn>
          </div>
        </Demo>
        <Demo state="banner" label="Banner">
          <div className="flex flex-wrap gap-2">
            <Btn
              id="fb-banner-add"
              onClick={() => {
                const n = nextBanner + 1
                setNextBanner(n)
                const k = KINDS[(n - 1) % KINDS.length]
                banners.push({
                  id: `b-${n}`,
                  kind: k,
                  text: `Notice ${n}: ${k}.`,
                  action: {
                    label: 'Open',
                    run: () => setSaid('Banner action'),
                  },
                })
              }}
            >
              {T.showABanner}
            </Btn>
          </div>
        </Demo>
      </Cells>

      <div data-testid="fb-banner-host" className="fb-banner-host">
        <BannerHost queue={banners} />
      </div>

      <Cells>
        <Demo state="sheet-inline" label="Sheet (drawn in place)">
          <div style={{ width: 376, maxWidth: '100%' }}>
            <Sheet
              mode="inline"
              title={T.pageSettings}
              onClose={() => {}}
              footer={
                <button type="button" className="fb-btn" data-variant="main">
                  {T.done}
                </button>
              }
            >
              <p className="t-small">{T.theBodyScrollsThe}</p>
            </Sheet>
          </div>
        </Demo>
        <Demo state="confirm-inline" label="Confirm (drawn in place)">
          <ConfirmDialog
            mode="inline"
            title={T.deleteThisPage}
            text="You can undo this."
            confirmLabel="Delete"
            danger
            onConfirm={() => {}}
            onCancel={() => {}}
          />
        </Demo>
        <Demo state="prompt-inline" label="Name, 33 of 40 (drawn in place)">
          <PromptDialog
            mode="inline"
            title={T.nameTheNotebook}
            label="Name"
            initial={LONG_NAME}
            onSubmit={() => {}}
            onCancel={() => {}}
          />
        </Demo>
        <Demo state="toasts-inline" label="Toasts (drawn in place)">
          <ToastStack mode="inline" toasts={staticToasts} />
        </Demo>
      </Cells>

      {sheetOpen && (
        <Sheet
          title={T.pageSettings}
          opener={sheetOpener}
          onClose={() => {
            setSheetOpen(false)
            setSaid('Sheet closed')
          }}
          footer={
            <>
              <button
                type="button"
                className="fb-btn"
                onClick={() => setSaid('Sheet cancelled')}
              >
                {T.cancel}
              </button>
              <button
                type="button"
                className="fb-btn"
                data-variant="main"
                data-autofocus=""
                onClick={() => setSaid('Sheet done')}
              >
                {T.done}
              </button>
            </>
          }
        >
          <div data-testid="fb-sheet-lines">
            {Array.from({ length: 24 }, (_, i) => (
              <p key={i} className="t-small" style={{ margin: '0 0 12px' }}>
                {T.setting} {i + 1}
              </p>
            ))}
          </div>
        </Sheet>
      )}
      {open === 'confirm' && (
        <ConfirmDialog
          title={T.moveToAnotherNotebook}
          text="The page keeps its links."
          confirmLabel="Move"
          opener={opener}
          onConfirm={close('Confirmed')}
          onCancel={close('Cancelled')}
        />
      )}
      {open === 'danger' && (
        <ConfirmDialog
          title={T.deleteThisPage}
          text="You can undo this."
          confirmLabel="Delete"
          danger
          opener={opener}
          onConfirm={close('Deleted')}
          onCancel={close('Cancelled')}
        />
      )}
      {open === 'alert' && (
        <AlertDialog
          title={T.youAreOffline}
          text="Your notes are on this device."
          opener={opener}
          onClose={close('Alert closed')}
        />
      )}
      {open === 'prompt' && (
        <PromptDialog
          title={T.nameTheNotebook}
          label="Name"
          opener={opener}
          onSubmit={(v) => close(`Named ${v}`)()}
          onCancel={close('Name cancelled')}
        />
      )}
      <ToastStack toasts={toasts} />
    </Section>
  )
}
