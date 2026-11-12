import { ClearField } from '../parts/ClearField'
import { Cells, Demo, Section } from './Bits'
import { G } from './galleryText'

export default function ClearSection() {
  return (
    <Section
      id="clear"
      title={G.field}
      help="A ✕ shows only while there is text. Esc clears first. Note text opts out."
    >
      <Cells>
        <Demo state="empty" label="Empty (no ✕)">
          <ClearField
            aria-label={G.searchEmpty}
            placeholder={G.search}
            data-testid="clr-empty"
          />
        </Demo>
        <Demo state="with-text" label="With text">
          <ClearField
            aria-label={G.searchText}
            placeholder={G.search}
            defaultValue="habits"
            data-testid="clr-text"
          />
        </Demo>
        <Demo state="focus" label="Focus (click into it)">
          <ClearField
            aria-label={G.searchFocus}
            placeholder={G.search}
            defaultValue="focus me"
            data-testid="clr-focus"
          />
        </Demo>
        <Demo state="disabled" label="Disabled">
          <ClearField
            aria-label={G.searchDisabled}
            placeholder={G.search}
            defaultValue="locked"
            disabled
            data-testid="clr-disabled"
          />
        </Demo>
        <Demo state="textarea" label="Textarea (✕ top right)">
          <ClearField
            multiline
            aria-label={G.notes}
            placeholder={G.notes}
            defaultValue="A few lines of text"
            rows={3}
            data-testid="clr-area"
          />
        </Demo>
        <Demo state="opt-out" label="Opt-out sample: a note text box has no ✕">
          <ClearField
            aria-label={G.noteText}
            placeholder={G.noteText}
            defaultValue="Some note text"
            data-noclr=""
            data-testid="clr-noclr"
          />
        </Demo>
      </Cells>
    </Section>
  )
}
