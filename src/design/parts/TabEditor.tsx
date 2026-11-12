import { useId, useRef, useState } from 'react'
import { ReorderList } from './drag/ReorderList'
import { ClearField } from './ClearField'
import { SheetBase } from './SheetBase'
import { tp } from './tp'
import type { TabDef, TabSet, TabSource } from './useTabSet'
import './TabRow.css'

function NameField({
  tab,
  onRename,
}: {
  tab: TabDef
  onRename(label: string): void
}) {
  const ref = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null)
  const commit = () => {
    const el = ref.current
    if (!el) return
    const v = el.value.trim()
    if (!v && tab.custom) el.value = tab.label
    else if (v !== tab.label) onRename(v)
  }
  return (
    <ClearField
      ref={ref}
      key={tab.label}
      className="tabed-input"
      defaultValue={tab.label}
      maxLength={40}
      aria-label={tp('parts.tabs.rename', { name: tab.label })}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') commit()
      }}
    />
  )
}

/** "Edit tabs…" dialog (SP-03): rename, reorder (SP-06 rows), remove, reset, undo. */
export function TabEditor({
  set,
  onClose,
  mode,
  anchor,
}: {
  set: TabSet
  onClose(): void
  mode?: 'floating' | 'inline'
  anchor?: HTMLElement | null
}) {
  const { tabs } = set
  return (
    <SheetBase
      title={tp('parts.tabs.editTitle')}
      mode={mode}
      anchor={anchor}
      onClose={onClose}
      data-testid="tab-editor"
      footer={
        <>
          <button
            type="button"
            className="tabed-btn"
            data-testid="tabed-reset"
            onClick={set.reset}
          >
            {tp('parts.tabs.reset')}
          </button>
          <button
            type="button"
            className="tabed-btn"
            data-testid="tabed-undo"
            disabled={!set.canUndo}
            onClick={set.undo}
          >
            {tp('parts.tabs.undo')}
          </button>
          <span className="tabed-spacer" />
          <button
            type="button"
            className="tabed-btn tabed-primary"
            data-testid="tabed-done"
            data-autofocus=""
            onClick={onClose}
          >
            {tp('parts.tabs.done')}
          </button>
        </>
      }
    >
      <p className="tabed-help">{tp('parts.tabs.editHelp')}</p>
      <ReorderList
        items={tabs}
        getId={(x) => x.id}
        label={(x) => x.label}
        axis="y"
        handle="grip"
        showMoveButtons
        onMove={(id, to) =>
          set.move(
            tabs.findIndex((x) => x.id === id),
            to,
          )
        }
        aria-label={tp('parts.tabs.editTitle')}
        className="tabed-list"
        testId="tabed-list"
        renderItem={(tab, ctx) => (
          <div className="tabed-row" data-testid="tabed-row">
            {ctx.grip}
            <NameField tab={tab} onRename={(l) => set.rename(tab.id, l)} />
            {ctx.moveButtons}
            <button
              type="button"
              className="tabed-remove"
              data-testid="tabed-remove"
              aria-label={tp('parts.tabs.remove', { name: tab.label })}
              disabled={tabs.length <= 1}
              onClick={() => set.remove(tab.id)}
            >
              <span aria-hidden="true">✕</span>
            </button>
          </div>
        )}
      />
      <div className="tabed-preview" data-testid="tabed-preview">
        <span className="tabed-preview-label">{tp('parts.tabs.preview')}</span>
        <span className="tabed-chips">
          {tabs.map((x) => (
            <span key={x.id} className="tabed-chip">
              {x.label}
            </span>
          ))}
        </span>
      </div>
    </SheetBase>
  )
}

/** "Create your own tab": name it and point it at one thing. */
export function CreateTab({
  sources,
  onCreate,
  onClose,
  mode,
  anchor,
}: {
  sources: TabSource[]
  onCreate(label: string, source?: string): void
  onClose(): void
  mode?: 'floating' | 'inline'
  anchor?: HTMLElement | null
}) {
  const [name, setName] = useState('')
  const [source, setSource] = useState('')
  const gid = useId()
  const ok = name.trim().length > 0
  const submit = () => {
    if (ok) onCreate(name.trim(), source || undefined)
  }
  const options = [{ id: '', label: tp('parts.tabs.noPoint') }, ...sources]
  return (
    <SheetBase
      title={tp('parts.tabs.createTitle')}
      mode={mode}
      anchor={anchor}
      onClose={onClose}
      data-testid="tab-create"
      footer={
        <>
          <span className="tabed-spacer" />
          <button
            type="button"
            className="tabed-btn tabed-primary"
            data-testid="tabcreate-add"
            disabled={!ok}
            onClick={submit}
          >
            {tp('parts.tabs.createDone')}
          </button>
        </>
      }
    >
      <label className="tabed-label" htmlFor={`${gid}-n`}>
        {tp('parts.tabs.name')}
      </label>
      <ClearField
        id={`${gid}-n`}
        className="tabed-input"
        data-autofocus=""
        value={name}
        maxLength={40}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') submit()
        }}
      />
      {sources.length > 0 ? (
        <fieldset className="tabed-sources">
          <legend className="tabed-label">{tp('parts.tabs.pointAt')}</legend>
          {options.map((s) => (
            <label key={s.id} className="tabed-source">
              <input
                type="radio"
                name={`${gid}-s`}
                checked={source === s.id}
                onChange={() => setSource(s.id)}
              />
              {s.label}
            </label>
          ))}
        </fieldset>
      ) : null}
    </SheetBase>
  )
}
