import { useMemo, useState } from 'react'
import { AlertDialog, ConfirmDialog, PromptDialog } from '../parts/Dialogs'
import { Sheet } from '../parts/Sheet'
import { ToastStack } from '../parts/ToastStack'
import { createToasts } from '../parts/toastLogic'
import { BannerHost } from '../parts/Banner'
import { createBannerQueue } from '../parts/bannerQueue'
import '../parts/Dialogs.css'
import { Cells, Demo, Section } from './Bits'

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
  const toasts = useMemo(() => createToasts(), [])
  const staticToasts = useMemo(() => {
    const t = createToasts()
    t.push('done', 'Saved')
    t.push('undo', 'Page moved to Trash', () => {})
    t.push('problem', 'Could not save. Try again.')
    return t
  }, [])
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
      title="Sheet, dialogs, toasts and banner"
      help="Press a button to open the real thing. Esc and ✕ close it."
    >
      <p className="t-small" data-testid="fb-said" aria-live="polite">
        {said}
      </p>

      <Cells>
        <Demo state="sheet" label="Sheet">
          <Btn id="fb-open-sheet" onClick={showSheet}>
            Open the sheet
          </Btn>
        </Demo>
        <Demo state="dialogs" label="Dialogs">
          <div className="flex flex-wrap gap-2">
            <Btn id="fb-open-confirm" onClick={show('confirm')}>
              Confirm
            </Btn>
            <Btn id="fb-open-danger" onClick={show('danger')}>
              Delete (red)
            </Btn>
            <Btn id="fb-open-alert" onClick={show('alert')}>
              Alert
            </Btn>
            <Btn id="fb-open-prompt" onClick={show('prompt')}>
              Name
            </Btn>
          </div>
        </Demo>
        <Demo state="toasts" label="Toasts">
          <div className="flex flex-wrap gap-2">
            <Btn
              id="fb-toast-done"
              onClick={() => toasts.push('done', 'Saved')}
            >
              Done
            </Btn>
            <Btn
              id="fb-toast-undo-btn"
              onClick={() =>
                toasts.push('undo', 'Page moved to Trash', () =>
                  setSaid('Undo pressed'),
                )
              }
            >
              Undo
            </Btn>
            <Btn
              id="fb-toast-problem"
              onClick={() =>
                toasts.push('problem', 'Could not save. Try again.')
              }
            >
              Problem
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
              Show a banner
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
              title="Page settings"
              onClose={() => {}}
              footer={
                <button type="button" className="fb-btn" data-variant="main">
                  Done
                </button>
              }
            >
              <p className="t-small">The body scrolls. The footer stays.</p>
            </Sheet>
          </div>
        </Demo>
        <Demo state="confirm-inline" label="Confirm (drawn in place)">
          <ConfirmDialog
            mode="inline"
            title="Delete this page?"
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
            title="Name the notebook"
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
          title="Page settings"
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
                Cancel
              </button>
              <button
                type="button"
                className="fb-btn"
                data-variant="main"
                data-autofocus=""
                onClick={() => setSaid('Sheet done')}
              >
                Done
              </button>
            </>
          }
        >
          <div data-testid="fb-sheet-lines">
            {Array.from({ length: 24 }, (_, i) => (
              <p key={i} className="t-small" style={{ margin: '0 0 12px' }}>
                Setting {i + 1}
              </p>
            ))}
          </div>
        </Sheet>
      )}
      {open === 'confirm' && (
        <ConfirmDialog
          title="Move to another notebook?"
          text="The page keeps its links."
          confirmLabel="Move"
          opener={opener}
          onConfirm={close('Confirmed')}
          onCancel={close('Cancelled')}
        />
      )}
      {open === 'danger' && (
        <ConfirmDialog
          title="Delete this page?"
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
          title="You are offline"
          text="Your notes are on this device."
          opener={opener}
          onClose={close('Alert closed')}
        />
      )}
      {open === 'prompt' && (
        <PromptDialog
          title="Name the notebook"
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
