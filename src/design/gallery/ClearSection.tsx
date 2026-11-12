import { ClearField } from '../parts/ClearField'
import { Cells, Demo, Section } from './Bits'

export default function ClearSection() {
  return (
    <Section
      id="clear"
      title="✕ field"
      help="A ✕ shows only while there is text. Esc clears first. Note text opts out."
    >
      <Cells>
        <Demo state="empty" label="Empty (no ✕)">
          <ClearField
            aria-label="Search empty"
            placeholder="Search"
            data-testid="clr-empty"
          />
        </Demo>
        <Demo state="with-text" label="With text">
          <ClearField
            aria-label="Search text"
            placeholder="Search"
            defaultValue="habits"
            data-testid="clr-text"
          />
        </Demo>
        <Demo state="focus" label="Focus (click into it)">
          <ClearField
            aria-label="Search focus"
            placeholder="Search"
            defaultValue="focus me"
            data-testid="clr-focus"
          />
        </Demo>
        <Demo state="disabled" label="Disabled">
          <ClearField
            aria-label="Search disabled"
            placeholder="Search"
            defaultValue="locked"
            disabled
            data-testid="clr-disabled"
          />
        </Demo>
        <Demo state="textarea" label="Textarea (✕ top right)">
          <ClearField
            multiline
            aria-label="Notes"
            placeholder="Notes"
            defaultValue="A few lines of text"
            rows={3}
            data-testid="clr-area"
          />
        </Demo>
        <Demo state="opt-out" label="Opt-out sample: a note text box has no ✕">
          <ClearField
            aria-label="Note text"
            placeholder="Note text"
            defaultValue="Some note text"
            data-noclr=""
            data-testid="clr-noclr"
          />
        </Demo>
      </Cells>
    </Section>
  )
}
