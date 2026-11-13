import { useEffect, useRef, useState } from 'react'
import { createId } from '../../core/ids'
import type { JsonValue } from '../../core/types'
import { t, type MessageKey } from '../../i18n/t'
import { ClearField } from '../../design/parts/ClearField'
import {
  BUILTIN_LABELS,
  DEFAULT_LABELS,
  isLabelList,
  LABEL_COLORS,
  MAX_LABELS,
  markName,
  type LabelDef,
} from '../../revise/reviseMarks'
import './labelsEditor.css'

/**
 * The Revise labels list in Settings v3: name, colour, add, remove. Same
 * stored value as today's editor. Every button is 44 pt; each name has a ✕.
 */
export function LabelsEditor({
  value,
  onSave,
  labelId,
  descId,
}: {
  value: JsonValue
  onSave(next: JsonValue): void
  labelId?: string
  descId: string
}) {
  const saved = isLabelList(value)
    ? value
    : DEFAULT_LABELS.map((l) => ({ ...l }))
  const [draft, setDraft] = useState<LabelDef[]>(saved)
  // What this control last saved: that echo must not overwrite typing.
  const lastSaved = useRef(JSON.stringify(saved))
  const savedText = JSON.stringify(saved)
  useEffect(() => {
    if (savedText !== lastSaved.current) {
      lastSaved.current = savedText
      setDraft(JSON.parse(savedText) as LabelDef[])
    }
  }, [savedText])
  const commit = (next: LabelDef[]) => {
    setDraft(next)
    if (isLabelList(next) && JSON.stringify(next) !== savedText) {
      lastSaved.current = JSON.stringify(next)
      onSave(next as unknown as JsonValue)
    }
  }
  const change = (id: string, patch: Partial<LabelDef>) =>
    draft.map((l) => (l.id === id ? { ...l, ...patch } : l))
  const nameOf = (l: LabelDef) => l.name || markName(l.id)

  return (
    <div
      role="group"
      aria-labelledby={labelId}
      aria-describedby={descId}
      data-labels-editor
      className="sv3-labels"
    >
      <ul className="sv3-labels-list">
        {draft.map((l, i) => (
          <li key={l.id} data-label-id={l.id} className="sv3-labels-item">
            <ClearField
              type="text"
              value={l.name}
              maxLength={40}
              placeholder={markName(l.id)}
              aria-label={t('settings.reviseLabels.name', { n: i + 1 })}
              onChange={(e) => setDraft(change(l.id, { name: e.target.value }))}
              onClear={() => commit(change(l.id, { name: '' }))}
              onBlur={() => commit(draft)}
              onKeyDown={(e) => e.key === 'Enter' && commit(draft)}
              className="sv3-labels-name"
            />
            <span
              role="group"
              aria-label={t('settings.reviseLabels.color', { name: nameOf(l) })}
              className="sv3-labels-colors"
            >
              {LABEL_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  aria-pressed={l.color === color}
                  aria-label={t(`tags.color.${color}` as MessageKey)}
                  onClick={() => commit(change(l.id, { color }))}
                  className="sv3-swatch"
                >
                  <span style={{ background: color }} />
                </button>
              ))}
            </span>
            {!(BUILTIN_LABELS as readonly string[]).includes(l.id) && (
              <button
                type="button"
                data-label-remove
                aria-label={t('settings.reviseLabels.remove', {
                  name: nameOf(l),
                })}
                onClick={() => commit(draft.filter((x) => x.id !== l.id))}
                className="sv3-icon-btn"
              >
                ✕
              </button>
            )}
          </li>
        ))}
      </ul>
      {draft.length < MAX_LABELS && (
        <button
          type="button"
          data-label-add
          className="sv3-btn"
          onClick={() =>
            commit([
              ...draft,
              {
                id: createId(),
                name: t('settings.reviseLabels.newName'),
                color: LABEL_COLORS[draft.length % LABEL_COLORS.length],
              },
            ])
          }
        >
          {t('settings.reviseLabels.add')}
        </button>
      )}
    </div>
  )
}
