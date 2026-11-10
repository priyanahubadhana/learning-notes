import type { Editor } from '../../../editor/barActions'
import { t } from '../../../i18n/t'
import { runEditorCommand } from '../editorCommands'
import { Icon, type IconName } from '../icons'
import { ALIGNS, alignOf, setAlign, setList } from './textOps'
import { useEditorRedraw } from './useEditorRedraw'
import { keepFocus } from './pillKit'

/**
 * The iPad keyboard bar (bug batch 2, item 8; GoodNotes shows the same): a
 * 44 px glass bar on top of the on-screen keyboard with outdent, indent,
 * bullets, numbers, checklist, align, B, I, U, S and hide. Web cannot add to
 * Apple's own shortcut row, so this is our bar. It shows only when the
 * keyboard shrinks the viewport (a hardware keyboard shows none) and replaces
 * the micro bar while it is up. Loaded only then.
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
  const block = editor.getTextCursorPosition().block as unknown as {
    props: Record<string, unknown>
  }
  const run = (id: string) =>
    runEditorCommand(id, { editor, extras: null, app: null })
  const nextAlign = () => {
    const a = alignOf(block)
    setAlign(editor, ALIGNS[(ALIGNS.indexOf(a) + 1) % ALIGNS.length])
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
      {btn('bold', 'bold', t('tool.bold'), () => run('bold'))}
      {btn('italic', 'italic', t('tool.italic'), () => run('italic'))}
      {btn(
        'underline',
        null,
        t('kbBar.underline'),
        () => run('underline'),
        'U',
      )}
      {btn('strike', null, t('kbBar.strike'), () => run('strike'), 'S')}
      {btn('hide', 'close', t('kbBar.hide'), () =>
        (document.activeElement as HTMLElement | null)?.blur(),
      )}
    </div>
  )
}
