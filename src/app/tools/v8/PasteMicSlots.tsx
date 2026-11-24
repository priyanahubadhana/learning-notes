import { t } from '../../../i18n/t'
import type { Editor } from '../../../editor/barActions'
import { Icon } from '../icons'
import { dictating, toggleMic } from '../main/micControl'
import { PasteButton } from '../main/PasteButton'
import { keepFocus } from '../main/pillKit'

/**
 * Mic and Paste ▾ for the v8 tool row (page.menus; owner B12, 19 Nov 2026).
 * They sit with Backspace and Enter, as in the approved picture paste-mock2.
 * The Mic speaks directly: the floating Pencil bar is hidden while the top
 * row shows all four buttons, so a Mic that only opened that bar did nothing.
 */
export function MicSlot({ editor }: { editor: Editor | null }) {
  const listening = dictating.useValue()
  return (
    <button
      type="button"
      data-chrome
      data-action="miniKeys"
      data-testid="v8-mic"
      className="v8tool"
      aria-label={t('keys.mic')}
      aria-pressed={listening}
      data-active={listening || undefined}
      onMouseDown={keepFocus}
      onClick={() => editor && toggleMic(editor)}
    >
      <Icon name="mic" size={20} />
    </button>
  )
}

export function PasteSlot({ editor }: { editor: Editor | null }) {
  if (!editor) return null
  return <PasteButton editor={editor} testId="top-paste" look="v8" />
}
