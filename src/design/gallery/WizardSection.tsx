import { useState } from 'react'
import { WizardSteps } from '../parts/WizardSteps'
import { visibleSteps, type WizardStep } from '../parts/wizardLogic'
import { Cells, Demo, Section } from './Bits'
import './Step3.css'

const T = {
  title: 'Wizard steps',
  help: 'A row of numbered steps. Tap a finished step to go back; nothing you typed is lost.',
  three: '3 steps',
  six: '6 steps, long names',
  states: 'Done, current, upcoming, error, disabled',
  compact: 'Compact',
  proHidden: 'Pro step hidden (Beginner)',
  proShown: 'Pro step unlocked',
  form: 'Form: Back keeps what you typed',
  fileName: 'File name',
  checkNote: 'Note for the check',
  missing: 'Type a file name to go on.',
  unlock: 'Unlock "Match columns"',
  lock: 'Lock it again',
  step: 'Step',
  last: 'All done.',
} as const

const THREE: WizardStep[] = [
  { id: 'file', label: 'File' },
  { id: 'check', label: 'Check' },
  { id: 'done', label: 'Done' },
]
const FOUR: WizardStep[] = [
  { id: 'a', label: 'File' },
  { id: 'b', label: 'Check' },
  { id: 'c', label: 'Look' },
  { id: 'd', label: 'Done' },
]
const SIX: WizardStep[] = [
  { id: 'a', label: 'Choose the file' },
  { id: 'b', label: 'Match the columns' },
  { id: 'c', label: 'Check every row' },
  { id: 'd', label: 'Fix the problems' },
  { id: 'e', label: 'Look it over' },
  { id: 'f', label: 'Finish up' },
]
const STATES: WizardStep[] = [
  { id: 'a', label: 'File', state: 'done' },
  { id: 'b', label: 'Match', state: 'error' },
  { id: 'c', label: 'Check' },
  { id: 'd', label: 'Done' },
]
const PRO: WizardStep[] = [
  { id: 'file', label: 'File' },
  { id: 'match', label: 'Match columns', pro: 'db.csvPlus' },
  { id: 'check', label: 'Check' },
  { id: 'done', label: 'Done' },
]

function Live({
  steps,
  start,
  id,
  valid,
}: {
  steps: WizardStep[]
  start: string
  id: string
  valid?: boolean
}) {
  const [v, setV] = useState(start)
  return (
    <div className="step3-box" data-testid={id}>
      <WizardSteps steps={steps} value={v} valid={valid} onChange={setV} />
    </div>
  )
}

/** A form with three steps: Back keeps what was typed (S3-14), a shut next step says why (S3-15). */
function FormDemo() {
  const [v, setV] = useState('file')
  const [name, setName] = useState('')
  const [note, setNote] = useState('')
  const [hint, setHint] = useState('')
  return (
    <div className="step3-box" data-testid="wiz-form">
      <WizardSteps
        steps={THREE}
        value={v}
        valid={name.trim() !== ''}
        onChange={(id) => {
          setHint('')
          setV(id)
        }}
        onBlocked={() => setHint(T.missing)}
      />
      <div className="step3-form">
        {v === 'file' ? (
          <label>
            {T.fileName}
            <input
              data-testid="wiz-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
        ) : v === 'check' ? (
          <label>
            {T.checkNote}
            <input
              data-testid="wiz-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </label>
        ) : (
          <p>{T.last}</p>
        )}
        <p className="step3-hint" data-testid="wiz-hint" aria-live="polite">
          {hint}
        </p>
      </div>
    </div>
  )
}

function ProDemo({ on }: { on: boolean }) {
  const steps = visibleSteps(PRO, () => on)
  return (
    <div className="step3-box" data-testid={on ? 'wiz-pro-on' : 'wiz-pro-off'}>
      <WizardSteps steps={steps} value="file" onChange={() => {}} />
    </div>
  )
}

export default function WizardSection() {
  const [unlocked, setUnlocked] = useState(false)
  return (
    <Section id="wizard" title={T.title} help={T.help}>
      <Cells>
        <Demo state="wiz-three" label={T.three}>
          <Live steps={THREE} start="file" id="wiz-three" />
        </Demo>
        <Demo state="wiz-four" label="4 steps, on step 2">
          <Live steps={FOUR} start="b" id="wiz-four" />
        </Demo>
        <Demo state="wiz-six" label={T.six}>
          <Live steps={SIX} start="c" id="wiz-six" />
        </Demo>
        <Demo state="wiz-states" label={T.states}>
          <Live steps={STATES} start="c" id="wiz-states" />
        </Demo>
        <Demo state="wiz-compact" label={T.compact}>
          <div className="step3-box" data-testid="wiz-compact-box">
            <WizardSteps
              steps={FOUR}
              value="b"
              compact
              onChange={() => {}}
              data-testid="wizard-forced"
            />
          </div>
        </Demo>
        <Demo state="wiz-form" label={T.form}>
          <FormDemo />
        </Demo>
        <Demo
          state="wiz-pro-hidden"
          label={unlocked ? T.proShown : T.proHidden}
        >
          <ProDemo on={unlocked} />
          <button
            type="button"
            className="fb-btn"
            data-testid="wiz-unlock"
            onClick={() => setUnlocked((u) => !u)}
          >
            {unlocked ? T.lock : T.unlock}
          </button>
        </Demo>
      </Cells>
    </Section>
  )
}
