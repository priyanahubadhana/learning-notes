import { useState } from 'react'
import type { Editor } from '../../../editor/barActions'
import {
  COLOR_NAMES,
  colorLabel,
  setColor,
  TEXT_HEX,
} from '../../../editor/colorData'
import { t } from '../../../i18n/t'
import { runEditorCommand } from '../editorCommands'
import { Icon, type IconName } from '../icons'
import { runTool } from '../toolRegistry'
import { ALIGNS, alignOf, setAlign, setList } from './textOps'
import { applyNoteStyle, NOTE_SIZES, noteSize } from './textStyle'
import { useEditorRedraw } from './useEditorRedraw'
import { keepFocus } from './pillKit'

/**
 * The text bar above the iPad keyboard (owner final 3b, 11 Nov; GoodNotes and
 * Notability show the same): font, size - and +, colour, Bold, Italic,
 * Underline, highlight and link, then a ⋯ for the rest (outdent, indent,
 * lists, align, strikethrough) and hide. It is the ONLY bar while typing in a
 * box (the box bar shows when a box is selected and not typing). Web cannot
 * add to Apple's own shortcut row, so this is our bar. It shows only when the
 * keyboard shrinks the viewport (a hardware keyboard shows none). Loaded only
 * then.
 */
export default function KeyboardBar({
  editor,
  inset,
}: {
  editor: Editor
  /** Pixels the keyboard covers at the bottom. */
  inset: number
}) {
  useEditorRedraw(editor)
  const [mode, setMode] = useState<'main' | 'colour' | 'more'>('main')
  const size = noteSize.useValue()
  const block = editor.getTextCursorPosition().block as unknown as {
    props: Record<string, unknown>
  }
  const run = (id: string) =>
    runEditorCommand(id, { editor, extras: null, app: null })
  const nextAlign = () => {
    const a = alignOf(block)
    setAlign(editor, ALIGNS[(ALIGNS.indexOf(a) + 1) % ALIGNS.length])
  }
  /** Size - and +: the note text size (Settings › text), one step at a time. */
  const step = (dir: 1 | -1) => {
    const at = NOTE_SIZES.findIndex((s) => s === size)
    const next =
      NOTE_SIZES[Math.min(NOTE_SIZES.length - 1, Math.max(0, at + dir))]
    noteSize.set(next)
    applyNoteStyle()
  }
  const btn = (
    id: string,
    icon: IconName | null,
    label: string,
    onClick: () => void,
    text?: string,
  ) => (
    <button
      key={id}
      type="button"
      data-kb-action={id}
      data-ui
      aria-label={label}
      onMouseDown={keepFocus}
      onPointerDown={(e) => e.preventDefault()}
      onClick={onClick}
      className="grid size-11 shrink-0 place-items-center rounded-lg text-ink hover:bg-hover"
    >
      {icon ? (
        <Icon name={icon} size={20} />
      ) : (
        <span className="font-semibold">{text}</span>
      )}
    </button>
  )
  const back = btn('back', 'close', t('kbBar.back'), () => setMode('main'))
  return (
    <div
      role="toolbar"
      aria-label={t('kbBar.label')}
      data-kb-bar
      data-ui
      data-chrome
      className="glass fixed inset-x-0 z-[45] flex h-11 items-center justify-center gap-0.5 overflow-x-auto px-2"
      style={{ bottom: inset }}
    >
      {mode === 'colour' && (
        <>
          {COLOR_NAMES.map((name) => (
            <button
              key={name}
              type="button"
              data-kb-colour={name}
              data-ui
              aria-label={colorLabel(name)}
              onMouseDown={keepFocus}
              onPointerDown={(e) => e.preventDefault()}
              onClick={() => {
                setColor(editor, 'textColor', name)
                setMode('main')
              }}
              className="grid size-11 shrink-0 place-items-center rounded-lg hover:bg-hover"
            >
              <span
                aria-hidden
                className="size-6 rounded-full border border-line-strong"
                style={{
                  background:
                    name === 'default' ? 'transparent' : TEXT_HEX[name],
                }}
              />
            </button>
          ))}
          {back}
        </>
      )}
      {mode === 'more' && (
        <>
          {btn('outdent', 'outdent' as IconName, t('kbBar.outdent'), () =>
            editor.unnestBlock(),
          )}
          {btn('indent', 'indent' as IconName, t('kbBar.indent'), () =>
            editor.nestBlock(),
          )}
          {btn('bullets', 'list', t('kbBar.bullets'), () =>
            setList(editor, 'bullets'),
          )}
          {btn('numbers', 'numbered', t('kbBar.numbers'), () =>
            setList(editor, 'numbers'),
          )}
          {btn('checklist', 'checklist', t('kbBar.checklist'), () =>
            setList(editor, 'checklist'),
          )}
          {btn('align', 'alignLeft', t('kbBar.align'), nextAlign)}
          {btn('strike', null, t('kbBar.strike'), () => run('strike'), 'S')}
          {back}
        </>
      )}
      {mode === 'main' && (
        <>
          {btn('font', 'font', t('tool.font'), () => runTool('font'))}
          {btn('sizeDown', 'minus', t('kbBar.sizeDown'), () => step(-1))}
          <span
            data-kb-size
            aria-live="polite"
            className="min-w-10 shrink-0 text-center text-sm tabular-nums text-ink-soft"
          >
            {size}
          </span>
          {btn('sizeUp', 'plus', t('kbBar.sizeUp'), () => step(1))}
          {btn('colour', 'palette', t('main.card.text.textColor'), () =>
            setMode('colour'),
          )}
          {btn('bold', 'bold', t('tool.bold'), () => run('bold'))}
          {btn('italic', 'italic', t('tool.italic'), () => run('italic'))}
          {btn(
            'underline',
            null,
            t('kbBar.underline'),
            () => run('underline'),
            'U',
          )}
          {btn('highlight', 'highlighter', t('tool.highlight'), () =>
            run('highlight'),
          )}
          {btn('link', 'link', t('main.text.link'), () => runTool('link'))}
          {btn('more', 'more', t('kbBar.more'), () => setMode('more'))}
          {btn('hide', 'close', t('kbBar.hide'), () =>
            (document.activeElement as HTMLElement | null)?.blur(),
          )}
        </>
      )}
    </div>
  )
}
