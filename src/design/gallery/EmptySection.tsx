import { useState } from 'react'
import { EmptyState } from '../parts/EmptyState'
import { Cells, Demo, Section } from './Bits'

export default function EmptySection() {
  const [said, setSaid] = useState('Nothing pressed yet')
  const press = (what: string) => () => setSaid(what)
  return (
    <Section
      id="empty"
      title="Empty state"
      help="One icon, one line, one button."
    >
      <p className="t-small" data-testid="empty-said" aria-live="polite">
        {said}
      </p>
      <Cells>
        <Demo state="page" label="Page">
          <EmptyState
            testId="es-page"
            title="No notebooks yet"
            text="Start your first notebook."
            action="New notebook"
            onAction={press('page action')}
          />
        </Demo>
        <Demo state="inline" label="Inline">
          <EmptyState
            variant="inline"
            testId="es-inline"
            title="No cards due"
            text="Come back tomorrow."
            action="Add a card"
            onAction={press('inline action')}
          />
        </Demo>
        <Demo state="offline" label="Offline">
          <EmptyState kind="offline" testId="es-offline" />
        </Demo>
        <Demo state="error" label="Error">
          <EmptyState
            kind="error"
            testId="es-error"
            onAction={press('try again')}
          />
        </Demo>
        <Demo state="second-action" label="With a second action">
          <EmptyState
            testId="es-second"
            title="No tags"
            text="Tags group your notes."
            action="Create a tag"
            onAction={press('first')}
            secondary="Import tags"
            onSecondary={press('second')}
          />
        </Demo>
      </Cells>
    </Section>
  )
}
