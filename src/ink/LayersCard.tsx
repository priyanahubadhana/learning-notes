import { useContext } from 'react'
import { AppUiContext } from '../app/appUi'
import { Icon, type IconName } from '../app/tools/icons'
import { ActionRow, ChipRow } from '../app/tools/main/cardParts'
import { keepFocus } from '../app/tools/main/pillKit'
import { t } from '../i18n/t'
import { emptyEdit } from './inkDoc'
import { bumpInk, useInk } from './inkRuntime'
import {
  activeLayerOf,
  canAddLayer,
  extraLayers,
  mergeExtras,
  mergeLayers,
  moved,
  newLayer,
  removed,
  setHidden,
  setLocked,
} from './layers'

/**
 * The Layers card. At most two layers: "Layer 2" over "Layer 1", over the
 * page's text (shown for orientation only). Each row: tap to make it the one
 * you draw on, show or hide, lock. Add, swap order, Merge (with a warning,
 * then Undo) and Delete (Undo) sit with the rows. Paper is chosen here too.
 */

const PAPERS = ['blank', 'lined', 'grid', 'dots'] as const

export function LayersCard() {
  const ink = useInk()
  const { toast, choose } = useContext(AppUiContext)
  if (!ink)
    return <p className="px-2 text-sm text-ink-soft">{t('ink.layers.empty')}</p>
  const { doc, controller } = ink
  // Top layer first, like a stack.
  const layers = [...doc.layers].reverse()
  const active = activeLayerOf(doc.layers, doc.chosenLayer)
  const paper = ink.paper() ?? 'blank'
  const extras = extraLayers(doc.layers).length
  const undo = { label: t('tool.undo'), onSelect: () => controller.undo() }

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
    controller.commit({ ...emptyEdit(), layers: [{ after: made }] })
    doc.chooseLayer(made.id)
    bumpInk()
  }

  const merge = async (fromId: string, intoId: string, all = false) => {
    const answer = await choose({
      title: t('ink.layers.mergeTitle'),
      message: t('ink.layers.mergeWarning'),
      options: [
        { value: 'cancel', label: t('dialog.cancel') },
        { value: 'merge', label: t('ink.layers.merge'), primary: true },
      ],
    })
    if (answer !== 'merge') return
    const edit = all ? mergeExtras(doc) : mergeLayers(doc, fromId, intoId)
    if (!edit) return
    controller.commit(edit)
    if (!doc.layer(doc.chosenLayer ?? '')) doc.chooseLayer(intoId)
    bumpInk()
    toast(t('ink.layers.merged'), undo)
  }

  const top = layers[0]
  const second = layers[1]

  return (
    <>
      {layers.length === 0 && (
        <p className="px-2 text-sm text-ink-soft">{t('ink.layers.empty')}</p>
      )}
      {extras > 0 && (
        <div
          data-layers-old
          className="grid gap-1 rounded-lg bg-soft p-2 text-sm"
        >
          <span>{t('ink.layers.old', { count: doc.layers.length })}</span>
          <button
            type="button"
            data-layer-merge-extras
            onMouseDown={keepFocus}
            onClick={() => {
              const into = doc.layers[1]
              if (into) void merge('', into.id, true)
            }}
            className="min-h-11 rounded-lg border border-line px-3 hover:bg-hover"
          >
            {t('ink.layers.mergeExtras')}
          </button>
        </div>
      )}
      <ul className="grid gap-0.5" data-layers>
        {layers.map((layer, i) => {
          const name = layer.name
          const strokes = doc.strokesOf(layer.id).length
          const drawing = active?.id === layer.id
          return (
            <li
              key={layer.id}
              data-layer={layer.id}
              data-layer-active={drawing ? '' : undefined}
              className={`flex items-center gap-0.5 rounded-lg border p-0.5 ${
                drawing ? 'border-accent bg-soft' : 'border-line'
              }`}
            >
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
                className="flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-lg px-2 text-start hover:bg-hover"
              >
                <span aria-hidden className="w-4 text-accent">
                  {drawing ? '✓' : ''}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm">{name}</span>
                <span className="shrink-0 text-xs text-ink-soft">
                  {t('ink.layers.strokes', { count: strokes })}
                </span>
              </button>
              <IconBtn
                id="visibility"
                icon={layer.hidden ? 'eyeOff' : 'eye'}
                label={t(layer.hidden ? 'ink.layers.show' : 'ink.layers.hide', {
                  name,
                })}
                pressed={!layer.hidden}
                onClick={() => doc.patchLayer(setHidden(layer, !layer.hidden))}
              />
              <IconBtn
                id="lock"
                icon="lock"
                label={t(
                  layer.locked ? 'ink.layers.unlock' : 'ink.layers.lock',
                  { name },
                )}
                pressed={!!layer.locked}
                onClick={() => doc.patchLayer(setLocked(layer, !layer.locked))}
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
                id="delete"
                icon="trash"
                label={t('ink.layers.delete', { name })}
                onClick={() => {
                  controller.commit({
                    ...emptyEdit(),
                    layers: [{ before: layer, after: removed(layer) }],
                  })
                  if (doc.chosenLayer === layer.id) doc.chooseLayer(null)
                  bumpInk()
                  toast(t('ink.layers.deleted'), undo)
                }}
              />
            </li>
          )
        })}
        <li
          data-layer-page
          className="flex min-h-11 items-center gap-2 rounded-lg border border-dashed border-line px-3 text-sm text-ink-soft"
        >
          <span aria-hidden className="w-4" />
          {t('ink.layers.page')}
        </li>
      </ul>
      {canAddLayer(doc.layers) && (
        <button
          type="button"
          data-layer-add
          onMouseDown={keepFocus}
          onClick={add}
          className="flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm hover:bg-hover"
        >
          <Icon name="plus" />
          {t('ink.layers.addTwo')}
        </button>
      )}
      {top && second && extras === 0 && (
        <button
          type="button"
          data-layer-merge
          onMouseDown={keepFocus}
          onClick={() => void merge(top.id, second.id)}
          className="flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm hover:bg-hover"
        >
          <Icon name="layers" />
          {t('ink.layers.mergeInto', { from: top.name, into: second.name })}
        </button>
      )}
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
