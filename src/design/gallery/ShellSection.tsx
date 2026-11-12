import { useEffect, useState } from 'react'
import { applyLanguage } from '../../i18n/languages'
import { Dialog } from '../../app/shell/Dialog'
import { EdgeHandle } from '../../app/shell/EdgeHandle'
import { FloatingBar } from '../../app/shell/FloatingBar'
import { MoreSheet } from '../../app/shell/MoreSheet'
import { PopMenu } from '../../app/shell/PopMenu'
import { ToastHost } from '../../app/shell/Toast'
import { shellToasts } from '../../app/shell/toastStore'
import { Cells, Demo, Section } from './Bits'
import { S } from './shellText'

const btn = 'sh-btn'

/** SH-09 to SH-13: the shell's sheet, dialogs, pop menu, toast, floating bars and chips. */
export default function ShellSection() {
  // The gallery route does not load the later English texts the shell uses.
  const [ready, setReady] = useState(false)
  useEffect(() => {
    void applyLanguage('en').then(() => setReady(true))
  }, [])
  const [sheet, setSheet] = useState(false)
  const [tab, setTab] = useState('look')
  const [dirty, setDirty] = useState(false)
  const [dialog, setDialog] = useState<null | 'plain' | 'danger' | 'name'>(null)
  const [name, setName] = useState('Cells')
  const [pop, setPop] = useState(false)
  const [popLow, setPopLow] = useState(false)
  const [edge, setEdge] = useState(false)
  const [said, setSaid] = useState('Nothing yet')
  const [popAnchor, setPopAnchor] = useState<HTMLElement | null>(null)
  const [lowAnchor, setLowAnchor] = useState<HTMLElement | null>(null)
  const items = (close: () => void) => [
    {
      items: [
        {
          id: 'rename',
          label: 'Rename',
          onPick: () => setSaid('Rename'),
        },
        { id: 'move', label: 'Move', onPick: () => setSaid('Move') },
      ],
    },
    {
      items: [
        {
          id: 'delete',
          label: 'Delete',
          danger: true,
          onPick: () => {
            setSaid('Delete')
            close()
          },
        },
      ],
    },
  ]
  return (
    <Section id="shellparts" title={S.title} help={S.help}>
      <p
        className="t-small"
        data-ready={ready ? '' : undefined}
        data-testid="shell-said"
        aria-live="polite"
      >
        {said}
      </p>
      <Cells>
        <Demo state="sheet" label="More sheet">
          <button
            type="button"
            className={btn}
            data-testid="open-more"
            onClick={() => setSheet(true)}
          >
            {S.openMore}
          </button>
        </Demo>
        <Demo state="dialogs" label="Small dialog">
          <button
            type="button"
            className={btn}
            data-testid="open-dialog"
            onClick={() => setDialog('plain')}
          >
            {S.plain}
          </button>
          <button
            type="button"
            className={btn}
            data-testid="open-danger"
            onClick={() => setDialog('danger')}
          >
            {S.destructive}
          </button>
          <button
            type="button"
            className={btn}
            data-testid="open-name"
            onClick={() => setDialog('name')}
          >
            {S.name}
          </button>
        </Demo>
        <Demo state="pop" label="Pop menu">
          <button
            type="button"
            className={btn}
            data-testid="open-pop"
            onClick={(e) => {
              setPopAnchor(e.currentTarget)
              setPop(true)
            }}
          >
            {S.openMenu}
          </button>
          <button
            type="button"
            className={btn}
            data-testid="open-pop-low"
            onClick={(e) => {
              setLowAnchor(e.currentTarget)
              setPopLow(true)
            }}
          >
            {S.menuLow}
          </button>
        </Demo>
        <Demo state="toast" label="Toast">
          <button
            type="button"
            className={btn}
            data-testid="toast-plain"
            onClick={() => shellToasts.show('Saved to this device')}
          >
            {S.plain}
          </button>
          <button
            type="button"
            className={btn}
            data-testid="toast-undo"
            onClick={() =>
              shellToasts.show('Page deleted', {
                label: 'Undo',
                onSelect: () => setSaid('Undone'),
              })
            }
          >
            {S.withUndo}
          </button>
          <button
            type="button"
            className={btn}
            data-testid="toast-two"
            onClick={() => {
              shellToasts.show('First message')
              shellToasts.show('Second message')
            }}
          >
            {S.two}
          </button>
        </Demo>
        <Demo state="bars" label="Floating bars and chips">
          <button
            type="button"
            className={btn}
            data-testid="open-edge"
            onClick={() => setEdge(true)}
          >
            {S.showEdge}
          </button>
          <FloatingBar id="demo-reader" label="Reader bar">
            <button type="button" className={btn}>
              Aa
            </button>
          </FloatingBar>
          <FloatingBar id="demo-draw" label="Drawing bar" lift={64}>
            <button type="button" className={btn}>
              {S.pen}
            </button>
          </FloatingBar>
        </Demo>
      </Cells>
      <ToastHost />
      {edge && (
        <EdgeHandle
          label="Tool bar"
          onShow={() => {
            setEdge(false)
            setSaid('Tool bar shown')
          }}
        />
      )}
      {sheet && (
        <MoreSheet
          title={S.notebookOptions}
          sub="Biology"
          tabs={[
            { id: 'look', label: 'Look' },
            { id: 'pages', label: 'Pages' },
            { id: 'share', label: 'Share' },
          ]}
          tab={tab}
          onTab={setTab}
          setKey="gallery-more"
          picker={[
            { id: 'all', label: 'All' },
            { id: 'cells', label: 'Cells' },
          ]}
          picked="all"
          hint="Nothing changes until Done"
          dirty={dirty}
          onDone={() => {
            setSheet(false)
            setDirty(false)
            setSaid('Done')
          }}
          onClose={() => {
            setSheet(false)
            setDirty(false)
            setSaid('Cancelled')
          }}
        >
          <label>
            {S.titleLabel}{' '}
            <input
              data-testid="more-field"
              defaultValue="Biology"
              onChange={() => setDirty(true)}
            />
          </label>
          {Array.from({ length: 30 }, (_, i) => (
            <p key={i}>
              {tab} {S.row} {i + 1}
            </p>
          ))}
        </MoreSheet>
      )}
      {dialog === 'plain' && (
        <Dialog
          title={S.moveTitle}
          confirmLabel="Move"
          onConfirm={() => {
            setDialog(null)
            setSaid('Moved')
          }}
          onCancel={() => {
            setDialog(null)
            setSaid('Not moved')
          }}
        >
          <p>{S.moveBody}</p>
        </Dialog>
      )}
      {dialog === 'danger' && (
        <Dialog
          title={S.deleteTitle}
          confirmLabel="Delete"
          destructive
          onConfirm={() => {
            setDialog(null)
            setSaid('Deleted')
          }}
          onCancel={() => {
            setDialog(null)
            setSaid('Kept')
          }}
        >
          <p>{S.deleteBody}</p>
        </Dialog>
      )}
      {dialog === 'name' && (
        <Dialog
          title={S.nameTitle}
          confirmLabel="Save"
          confirmDisabled={!name.trim()}
          onConfirm={() => {
            setDialog(null)
            setSaid(`Named ${name}`)
          }}
          onCancel={() => setDialog(null)}
        >
          <input
            data-autofocus
            data-testid="name-field"
            aria-label={S.name}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </Dialog>
      )}
      {pop && (
        <PopMenu
          label="Page actions"
          anchor={popAnchor}
          sections={items(() => setPop(false))}
          onClose={() => setPop(false)}
        />
      )}
      {popLow && (
        <PopMenu
          label="Page actions"
          anchor={lowAnchor}
          sections={items(() => setPopLow(false))}
          onClose={() => setPopLow(false)}
        />
      )}
    </Section>
  )
}
