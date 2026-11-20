import { useRef, useState } from 'react'
import { TextSelection, type Selection } from 'prosemirror-state'
import { t } from '../../../i18n/t'
import type { Editor } from '../../../editor/barActions'
import { boxHost } from '../../../editor/pasteBox'
import { pasteFailedMessage } from '../../../editor/appClipboard'
import { pasteFromClipboard } from '../../../editor/pasteFromBar'
import { pasteIn, peekPasteForms } from '../../../editor/menus/pasteMenu'
import { pasteInto } from '../../../paper/v2/oneBarOps'
import { AnchoredMenu } from '../AnchoredMenu'
import { Icon } from '../icons'
import { useAnchoredMenu } from '../useAnchoredMenu'
import { currentRunner } from '../toolRuntime'
import { pasteModeSetting } from '../../../settings/builtinSettings'
import { readDeviceSetting } from '../../../settings/settingsService'
import { PasteAskHint } from './PasteAskHint'
import { keepFocus } from './pillKit'

/**
 * Paste ▾ (owner, 19 Nov 2026, picture paste-mock2): one button for the top
 * tool row and the floating Pencil bar. A tap pastes the way Settings › Paste
 * as says (Keep look by default); ▾ lists Keep look, Plain text and, under
 * More, Match style, As quote, As text box, Link / Embed. It reuses the paste
 * code of the page menus and the box bar. The buttons never take focus and
 * the caret is put back before the paste, so it stays in the box (B9).
 */
// "pastebtn" is a plain :hover rule (index.css): the Pencil hovers on an iPad
// that reports no hover, where Tailwind's hover: variant stays off (C0-3).
const BTN =
  'pastebtn grid min-h-11 min-w-11 place-items-center rounded-xl text-ink-soft select-none'
// The top tool row's own look: the same highlight as every other tool there.
const V8 = 'v8tool'

type Row = { id: string; label: string; hint?: string }

export function PasteButton({
  editor,
  min = 44,
  testId = 'paste',
  look = 'plain',
}: {
  editor: Editor
  min?: number
  testId?: string
  look?: 'plain' | 'v8'
}) {
  const cls = look === 'v8' ? V8 : BTN
  const menu = useAnchoredMenu()
  const [more, setMore] = useState(false)
  const [forms, setForms] = useState<string[] | null>(null)
  const saved = useRef<Selection | null>(null)
  const toast = (m: string) => currentRunner().app?.toast(m)

  const remember = () => {
    saved.current = editor.prosemirrorView?.state.selection ?? null
  }
  /** Puts the caret back where it was before the button was touched. */
  const restore = () => {
    const view = editor.prosemirrorView
    const sel = saved.current
    if (view && sel && sel.to <= view.state.doc.content.size) {
      try {
        view.dispatch(
          view.state.tr.setSelection(
            TextSelection.between(
              view.state.doc.resolve(sel.anchor),
              view.state.doc.resolve(sel.head),
            ),
          ),
        )
      } catch {
        // The page changed under it: paste where the caret is now.
      }
    }
    editor.focus()
  }

  const tap = (e: { currentTarget: HTMLElement }) => {
    restore()
    void pasteFromClipboard(editor, toast, e.currentTarget)
  }
  const pick = (id: string) => {
    menu.close()
    setMore(false)
    restore()
    if (id === 'match') {
      void pasteInto(editor, 'match').then((ok) => {
        if (!ok) toast(pasteFailedMessage())
      })
      return
    }
    void pasteIn(editor, id, toast)
  }

  // The tick follows Settings › Paste as ("ask" counts as Keep look).
  const ticked =
    readDeviceSetting(pasteModeSetting) === 'plain' ? 'plain' : 'keep'
  const has = (id: string) => !forms || forms.includes(id)
  const first: Row[] = [
    {
      id: 'keep',
      label: t('parts.menus.pasteKeep'),
      hint: t('parts.menus.pasteKeepHint'),
    },
    {
      id: 'plain',
      label: t('parts.menus.pastePlain'),
      hint: t('parts.menus.pastePlainHint'),
    },
  ]
  const rest: Row[] = [
    {
      id: 'match',
      label: t('parts.menus.pasteMatch'),
      hint: t('parts.menus.pasteMatchHint'),
    },
    {
      id: 'quote',
      label: t('pageMenus.pasteQuote'),
      hint: t('pageMenus.pasteQuoteHint'),
    },
    ...(boxHost(editor) && has('box')
      ? [
          {
            id: 'box',
            label: t('pageMenus.pasteBox'),
            hint: t('pageMenus.pasteBoxHint'),
          },
        ]
      : []),
    // Always listed (the owner's list); a clipboard that is not an address
    // pastes as it was copied.
    {
      id: 'link',
      label: t('pageMenus.pasteLink'),
      hint: t('pageMenus.pasteLinkHint'),
    },
  ]
  const row = (r: Row, ticked = false) => (
    <button
      key={r.id}
      type="button"
      role="menuitem"
      data-paste-option={r.id}
      onMouseDown={keepFocus}
      onClick={() => pick(r.id)}
      className="flex min-h-11 w-full items-center justify-between gap-2 rounded-lg px-2 text-start hover:bg-hover"
    >
      <span className="flex flex-col">
        <span className="text-sm">{r.label}</span>
        {r.hint && <span className="text-xs text-ink-soft">{r.hint}</span>}
      </span>
      {ticked && <Icon name="check" size={16} />}
    </button>
  )

  return (
    <>
      <span
        data-paste-split
        data-paste-scope={testId}
        data-testid={testId}
        className="inline-flex shrink-0 items-center rounded-xl"
      >
        <button
          type="button"
          data-bar-btn
          data-action="paste"
          aria-label={t('onebar.paste')}
          onMouseDown={keepFocus}
          onPointerDown={remember}
          onClick={tap}
          style={{ minHeight: min, minWidth: min }}
          className={cls}
        >
          <Icon name="paste" />
        </button>
        <button
          type="button"
          data-bar-btn
          data-action="pasteMore"
          aria-label={t('onebar.pasteMore')}
          {...menu.trigger}
          onMouseDown={keepFocus}
          onPointerDown={remember}
          onClick={(e) => {
            if (!menu.open) {
              setMore(false)
              void peekPasteForms(editor).then(setForms)
            }
            menu.toggle(e)
          }}
          style={{ minHeight: min, minWidth: 28, padding: 0 }}
          className={cls}
        >
          <Icon name="chevronDown" size={14} />
        </button>
      </span>
      <PasteAskHint scope={testId} />
      <AnchoredMenu
        menu={menu}
        label={t('parts.menus.pasteAs')}
        width={260}
        focusFirst={false}
      >
        {first.map((r) => row(r, r.id === ticked))}
        <button
          type="button"
          data-paste-option="more"
          aria-expanded={more}
          onMouseDown={keepFocus}
          onClick={() => setMore(!more)}
          className="flex min-h-11 w-full items-center gap-1 rounded-lg px-2 text-sm text-accent hover:bg-hover"
        >
          {t('parts.menus.more')} ▾
        </button>
        {more && rest.map((r) => row(r))}
      </AnchoredMenu>
    </>
  )
}
