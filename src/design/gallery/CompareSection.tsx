import { useState } from 'react'
import { BeforeAfter } from '../parts/BeforeAfter'
import { CompareButton } from '../parts/CompareButton'
import type { CompareDoc } from '../parts/compareBlocks'
import '../parts/Dialogs.css'
import { Cells, Demo, Section } from './Bits'
import './Step3.css'

const T = {
  title: 'Before / after view',
  help: 'Hold the button to see the original picture, or see two copies side by side with the changes marked.',
  after: 'After: my edit',
  before: 'Before: the original',
  holdAfter: 'Hold: after',
  holdBefore: 'Hold: before',
  holdDisabled: 'Hold: no original',
  holdLive: 'Hold: try it',
  noOriginal: 'There is no original to compare.',
  changes: 'Side: changes',
  same: 'Side: two identical copies',
  loading: 'Side: loading',
  missing: 'Side: one copy has no content',
  phone: 'Side: phone, stacked',
  error: 'Side: error',
  mine: 'Mine',
  theirs: 'Theirs',
  keepMine: 'Keep mine',
  keepTheirs: 'Keep theirs',
  applied: 'Chosen',
  nothing: 'Nothing chosen yet',
  hold: 'Hold the button',
} as const

const long = (n: number): { id: string; text: string }[] =>
  Array.from({ length: n }, (_, i) => ({
    id: `s${i}`,
    text: `Line ${i + 1} stays exactly the same in both copies.`,
  }))

const MINE: CompareDoc = {
  blocks: [
    { id: 'h', text: 'Cell biology notes' },
    ...long(8),
    { id: 'p1', text: 'The nucleus holds the DNA of the cell.' },
    { id: 'p2', text: 'Mitochondria are the power station.' },
    { id: 'p3', text: 'A line only I wrote.' },
    { id: 'pic', text: '', picture: 'v1' },
  ],
}
const THEIRS: CompareDoc = {
  blocks: [
    { id: 'h', text: 'Cell biology notes' },
    ...long(8),
    { id: 'p1', text: 'The nucleus holds the DNA and the RNA of the cell.' },
    { id: 'p2', text: 'Mitochondria are the power station.' },
    { id: 'p4', text: 'A line only the other copy has.' },
    { id: 'pic', text: '', picture: 'v2' },
  ],
}

const Pic = ({ look, text }: { look: number; text: string }) => (
  <div className="tfd-pic" data-look={look} data-testid={`ba-pic-${look}`}>
    <p>{text}</p>
  </div>
)

function Live() {
  const [on, setOn] = useState(false)
  return (
    <div className="step3-box" data-testid="ba-live">
      <div className="step3-row">
        <CompareButton onShow={setOn} data-testid="ba-live-button" />
        <span className="step3-said" data-testid="ba-live-state">
          {on ? 'before' : 'after'}
        </span>
      </div>
      <div className="step3-hold-frame">
        <BeforeAfter
          mode="hold"
          showBefore={on}
          before={<Pic look={2} text={T.before} />}
          after={<Pic look={1} text={T.after} />}
        />
      </div>
    </div>
  )
}

export default function CompareSection() {
  const [chosen, setChosen] = useState<string>(T.nothing)
  const actions = (
    <>
      <button
        type="button"
        className="fb-btn"
        data-testid="ba-keep-mine"
        onClick={() => setChosen(`${T.applied}: ${T.keepMine}`)}
      >
        {T.keepMine}
      </button>
      <button
        type="button"
        className="fb-btn"
        data-variant="main"
        data-testid="ba-keep-theirs"
        onClick={() => setChosen(`${T.applied}: ${T.keepTheirs}`)}
      >
        {T.keepTheirs}
      </button>
    </>
  )
  const side = (extra = {}) => (
    <BeforeAfter
      mode="side"
      before={MINE}
      after={THEIRS}
      beforeLabel={T.mine}
      afterLabel={T.theirs}
      beforeMeta="12 Nov, 09:40"
      afterMeta="Now"
      actions={actions}
      {...extra}
    />
  )
  return (
    <Section id="compare" title={T.title} help={T.help}>
      <p className="step3-said" data-testid="ba-chosen" aria-live="polite">
        {chosen}
      </p>
      <Cells>
        <Demo state="cmp-hold-after" label={T.holdAfter}>
          <div className="step3-hold-frame">
            <BeforeAfter
              mode="hold"
              before={<Pic look={2} text={T.before} />}
              after={<Pic look={1} text={T.after} />}
            />
          </div>
        </Demo>
        <Demo state="cmp-hold-before" label={T.holdBefore}>
          <div className="step3-hold-frame">
            <BeforeAfter
              mode="hold"
              showBefore
              before={<Pic look={2} text={T.before} />}
              after={<Pic look={1} text={T.after} />}
            />
          </div>
        </Demo>
        <Demo state="cmp-hold-disabled" label={T.holdDisabled}>
          <CompareButton
            onShow={() => {}}
            disabledReason={T.noOriginal}
            data-testid="ba-disabled-button"
          />
          <p className="step3-said" data-testid="ba-why">
            {T.noOriginal}
          </p>
        </Demo>
        <Demo state="cmp-hold-live" label={T.holdLive}>
          <Live />
        </Demo>
      </Cells>
      <Demo state="cmp-side" label={T.changes}>
        <div className="step3-side-frame">{side({ onCopy: () => {} })}</div>
      </Demo>
      <Cells>
        <Demo state="cmp-same" label={T.same}>
          <div className="step3-side-frame step3-short">
            {side({ after: MINE })}
          </div>
        </Demo>
        <Demo state="cmp-loading" label={T.loading}>
          <div className="step3-side-frame step3-short">
            {side({ loading: true })}
          </div>
        </Demo>
        <Demo state="cmp-missing" label={T.missing}>
          <div className="step3-side-frame step3-short">
            {side({ before: { blocks: [] } })}
          </div>
        </Demo>
        <Demo state="cmp-error" label={T.error}>
          <div className="step3-side-frame step3-short">
            {side({ error: { onRetry: () => setChosen('retry') } })}
          </div>
        </Demo>
        <Demo state="cmp-phone" label={T.phone}>
          <div className="step3-side-frame step3-phone">
            {side({ stacked: true })}
          </div>
        </Demo>
      </Cells>
    </Section>
  )
}
