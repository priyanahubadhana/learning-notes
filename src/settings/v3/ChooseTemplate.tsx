import { useState } from 'react'
import type { JsonValue } from '../../core/types'
import { ClearField } from '../../design/parts/ClearField'
import { SheetBase } from '../../design/parts/SheetBase'
import { starterTemplates } from '../../templates/starterTemplates'
import { useUnlocked } from '../level'
import { tv } from './tv'

/**
 * SET-B31 / SET-P01: "Choose a template" for "Start new pages as". The stored
 * value is today's On / Off (Study notes or Blank), so Beginner picks one of
 * those two. With the Professional switch `general.newPageStudy` on, every
 * template is listed and searchable; those that cannot be the start page yet
 * say so. Nothing new is stored.
 */
export function ChooseTemplate({
  value,
  onSave,
}: {
  value: JsonValue
  onSave(next: JsonValue): void
}) {
  const [open, setOpen] = useState(false)
  const [opener, setOpener] = useState<HTMLElement | null>(null)
  const [query, setQuery] = useState('')
  const all = useUnlocked('general.newPageStudy')
  const study = starterTemplates().find((x) => x.title === 'Study notes')
  const choices = [
    { id: 'blank', name: tv('sv3.templateBlank'), pick: 'off', usable: true },
    {
      id: 'study',
      name: study?.title ?? 'Study notes',
      pick: 'on',
      usable: true,
    },
    ...(all
      ? starterTemplates()
          .filter((x) => x.title !== 'Study notes')
          .map((x) => ({ id: x.title, name: x.title, pick: '', usable: false }))
      : []),
  ]
  const q = query.trim().toLowerCase()
  const shown = choices.filter((c) => !q || c.name.toLowerCase().includes(q))
  const close = () => {
    setOpen(false)
    setQuery('')
  }
  return (
    <>
      <button
        ref={setOpener}
        type="button"
        data-choose-template
        className="sv3-btn"
        onClick={() => setOpen(true)}
      >
        {tv('sv3.chooseTemplate')}
      </button>
      {open && (
        <SheetBase
          title={tv('sv3.templateTitle')}
          anchor={opener}
          onClose={close}
          data-testid="sv3-template-picker"
        >
          <ClearField
            type="search"
            value={query}
            data-autofocus
            placeholder={tv('sv3.templateSearch')}
            aria-label={tv('sv3.templateSearch')}
            onChange={(e) => setQuery(e.target.value)}
            onClear={() => setQuery('')}
          />
          {shown.length === 0 ? (
            <p role="status" className="sv3-line-help">
              {tv('sv3.templateNone', { query: query.trim() })}
            </p>
          ) : (
            <ul className="sv3-tpl-list">
              {shown.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    data-template={c.id}
                    className="sv3-tpl"
                    aria-pressed={c.usable && value === c.pick}
                    disabled={!c.usable}
                    onClick={() => {
                      if (value !== c.pick) onSave(c.pick)
                      close()
                    }}
                  >
                    <span className="sv3-row-name">{c.name}</span>
                    {!c.usable && (
                      <span className="sv3-line-help">
                        {tv('sv3.templateLater')}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </SheetBase>
      )}
    </>
  )
}
