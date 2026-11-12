import { useState } from 'react'
import { TimeRangeBar } from '../parts/TimeRangeBar'
import type { DateRange } from '../parts/timeRange'
import { allPresets, defaultPresets } from '../parts/timeRangePresets'
import { Cells, Demo, Section } from './Bits'

const TODAY = '2026-11-12'

function Bar({
  id,
  start = 'today',
  editing,
  withWidgets,
  narrow,
}: {
  id: string
  start?: string
  editing?: boolean
  withWidgets?: boolean
  narrow?: boolean
}) {
  const [value, setValue] = useState(start)
  const [range, setRange] = useState<DateRange | null>(null)
  const [presets, setPresets] = useState(
    start === 'custom' || editing
      ? allPresets().filter((p) =>
          ['today', 'week', 'month', 'custom'].includes(p.id),
        )
      : defaultPresets(),
  )
  const [name, setName] = useState('Show:')
  return (
    <div
      data-testid={id}
      style={narrow ? { width: 360, maxWidth: '100%' } : undefined}
    >
      <TimeRangeBar
        name={name}
        presets={presets}
        value={value}
        today={TODAY}
        startEditing={editing}
        customRange
        editable
        onChange={(v, r) => {
          setValue(v)
          setRange(r)
        }}
        onEdit={(next) => {
          setName(next.name)
          setPresets(next.presets)
        }}
      />
      {withWidgets && (
        <ul className="mt-3 flex flex-wrap gap-2">
          {['Tasks', 'Cards', 'Notes'].map((w) => (
            <li
              key={w}
              data-testid="range-widget"
              data-range={range ? `${range.from}..${range.to}` : 'default'}
              className="bg-surface-1 t-small rounded-[var(--r-md)] px-3 py-2"
            >
              {w}: {range ? `${range.from} to ${range.to}` : 'today'}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default function RangeSection() {
  return (
    <Section
      id="range"
      title="Time range bar"
      help="One bar that every widget in a template follows."
    >
      <Cells>
        <Demo state="presets" label="Presets (every widget follows)">
          <Bar id="range-presets" withWidgets />
        </Demo>
        <Demo state="custom" label="Custom range">
          <Bar id="range-custom" start="custom" />
        </Demo>
        <Demo
          state="editing"
          label="Editing the custom range (set the end before the start to see the error)"
        >
          <Bar id="range-editing" editing />
        </Demo>
        <Demo state="phone-wrap" label="Phone width: it wraps">
          <Bar id="range-phone" narrow />
        </Demo>
      </Cells>
    </Section>
  )
}
