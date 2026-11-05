import { useContext, useState } from 'react'
import { AppUiContext } from '../app/appUi'
import { Icon, type IconName } from '../app/tools/icons'
import { ActionRow, ChipRow } from '../app/tools/main/cardParts'
import { keepFocus } from '../app/tools/main/pillKit'
import { t } from '../i18n/t'
import { emptyEdit } from './inkDoc'
import { bumpInk, useInk } from './inkRuntime'
import {
  canAddLayer,
  moved,
  newLayer,
  removed,
  rename,
  setHidden,
  setLocked,
} from './layers'

/**
 * The Layers card: every layer of the page with its name, show/hide, lock,
 * order and delete, which layer new ink goes to, and the paper behind the
 * ink. Reached from the Pen, Highlighter and Lasso cards.
 */

const PAPERS = ['blank', 'lined', 'grid', 'dots'] as const

export function LayersCard() {
  const ink = useInk()
  const { toast } = useContext(AppUiContext)
  if (!ink)
    return <p className="px-2 text-sm text-ink-soft">{t('ink.layers.empty')}</p>
  const { doc, controller } = ink
  // Top layer first, like a stack.
  const layers = [...doc.layers].reverse()
  const active = doc.layers.find((l) => l.id === doc.chosenLayer)
  const paper = ink.paper() ?? 'blank'

  const add = () => {
    if (!canAddLayer(doc.layers)) {
      toast(t('ink.layers.max'))
      return
    }
    const made = newLayer(
      doc.pageId,
      doc.layers,
      t('ink.layer.default', { n: doc.layers.length + 1 }),
    )
    const edit = { ...emptyEdit(), layers: [{ after: made }] }
    controller.commit(edit)
    doc.chooseLayer(made.id)
  }

  return (
    <>
      {layers.length === 0 && (
        <p className="px-2 text-sm text-ink-soft">{t('ink.layers.empty')}</p>
      )}
      <ul className="grid gap-0.5" data-layers>
        {layers.map((layer, i) => {
          const name = layer.name
          const strokes = doc.strokesOf(layer.id).length
          const drawing =
            (active?.id ?? doc.layers[doc.layers.length - 1]?.id) === layer.id
          return (
            <li
              key={layer.id}
              data-layer={layer.id}
              className="grid gap-0.5 rounded-lg border border-line p-1"
            >
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  data-layer-draw
                  aria-pressed={drawing}
                  aria-label={t('ink.layers.draw', { name })}
                  title={t('ink.layers.draw', { name })}
                  onMouseDown={keepFocus}
                  onClick={() => {
                    doc.chooseLayer(layer.id)
                    bumpInk()
                  }}
                  className="grid size-11 shrink-0 place-items-center rounded-lg hover:bg-hover"
                >
                  <span
                    className={`size-3.5 rounded-full border-2 border-accent ${drawing ? 'bg-accent' : 'bg-bg'}`}
                  />
                </button>
                <NameField
                  value={name}
                  onCommit={(v) => doc.patchLayer(rename(layer, v))}
                />
                <span className="shrink-0 text-xs text-ink-soft">
                  {t('ink.layers.strokes', { count: strokes })}
                </span>
              </div>
              <div className="flex items-center gap-0.5">
                <IconBtn
                  id="visibility"
                  icon={layer.hidden ? 'eyeOff' : 'eye'}
                  label={t(
                    layer.hidden ? 'ink.layers.show' : 'ink.layers.hide',
                    { name },
                  )}
                  pressed={!layer.hidden}
                  onClick={() =>
                    doc.patchLayer(setHidden(layer, !layer.hidden))
                  }
                />
                <IconBtn
                  id="lock"
                  icon="lock"
                  label={t(
                    layer.locked ? 'ink.layers.unlock' : 'ink.layers.lock',
                    { name },
                  )}
                  pressed={!!layer.locked}
                  onClick={() =>
                    doc.patchLayer(setLocked(layer, !layer.locked))
                  }
                />
                <IconBtn
                  id="up"
                  icon="chevronUp"
                  label={t('ink.layers.up', { name })}
                  disabled={i === 0}
                  onClick={() => {
                    const m = moved(doc.layers, layer.id, 'up')
                    if (m) doc.patchLayer(m)
                  }}
                />
                <IconBtn
                  id="down"
                  icon="chevronDown"
                  label={t('ink.layers.down', { name })}
                  disabled={i === layers.length - 1}
                  onClick={() => {
                    const m = moved(doc.layers, layer.id, 'down')
                    if (m) doc.patchLayer(m)
                  }}
                />
                <IconBtn
                  id="select"
                  icon="lasso"
                  label={t('ink.layers.selectAll', { name })}
                  disabled={
                    layer.hidden === true ||
                    layer.locked === true ||
                    strokes === 0
                  }
                  onClick={() =>
                    controller.select(
                      doc.strokesOf(layer.id).map((p) => p.stroke.id),
                    )
                  }
                />
                <span className="flex-1" />
                <IconBtn
                  id="delete"
                  icon="trash"
                  label={t('ink.layers.delete', { name })}
                  onClick={() => {
                    controller.commit({
                      ...emptyEdit(),
                      layers: [{ before: layer, after: removed(layer) }],
                    })
                    toast(t('ink.layers.deleted'))
                  }}
                />
              </div>
            </li>
          )
        })}
      </ul>
      <button
        type="button"
        data-layer-add
        onMouseDown={keepFocus}
        onClick={add}
        className="flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm hover:bg-hover"
      >
        <Icon name="plus" />
        {t('ink.layers.add')}
      </button>
      <hr className="my-0.5 border-line" />
      <ChipRow
        id="paper"
        label={t('ink.paper')}
        value={paper}
        columns={2}
        options={PAPERS.map((p) => ({ value: p, label: t(`ink.paper.${p}`) }))}
        onChange={(p) => ink.setPaper(p === 'blank' ? undefined : p)}
      />
      <ActionRow
        id="asDrawn"
        label={t('ink.asDrawn')}
        note={t('ink.asDrawn.note')}
        disabled
        onClick={() => toast(t('ink.asDrawn.note'))}
      />
    </>
  )
}

function IconBtn({
  id,
  icon,
  label,
  onClick,
  pressed,
  disabled,
}: {
  id: string
  icon: IconName
  label: string
  onClick: () => void
  pressed?: boolean
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      data-layer-action={id}
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      disabled={disabled}
      onMouseDown={keepFocus}
      onClick={onClick}
      className="grid size-11 place-items-center rounded-lg text-ink-soft hover:bg-hover hover:text-ink disabled:opacity-40 aria-pressed:text-accent"
    >
      <Icon name={icon} />
    </button>
  )
}

/** The layer's name: edited in place, saved when the field loses focus or Enter. */
function NameField({
  value,
  onCommit,
}: {
  value: string
  onCommit: (v: string) => void
}) {
  const [text, setText] = useState(value)
  const [seen, setSeen] = useState(value)
  if (seen !== value) {
    setSeen(value)
    setText(value)
  }
  return (
    <input
      data-layer-name
      aria-label={t('ink.layers.name')}
      value={text}
      maxLength={40}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => onCommit(text)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
      }}
      className="min-h-11 min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-2 text-sm hover:border-line focus:border-accent"
    />
  )
}
