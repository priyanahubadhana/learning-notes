import { useContext, useState } from 'react'
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

/** `hidePaper`: the paper is chosen elsewhere (Feel > Page), not twice. */
export function LayersCard({
  hidePaper = false,
  look,
}: {
  hidePaper?: boolean
  /** `v9`: the rows of the approved tool bar picture (picture, name, strokes, eye, lock, ⋯). */
  look?: 'v9'
}) {
  const ink = useInk()
  const [more, setMore] = useState<string | null>(null)
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
      <ul className={look === 'v9' ? 'lyr9-list' : 'grid gap-0.5'} data-layers>
        {layers.map((layer, i) => {
          const name = layer.name
          const strokes = doc.strokesOf(layer.id).length
          const drawing = active?.id === layer.id
          if (look === 'v9')
            return (
              <V9Row
                key={layer.id}
                name={name}
                id={layer.id}
                strokes={strokes}
                drawing={drawing}
                hidden={!!layer.hidden}
                locked={!!layer.locked}
                open={more === layer.id}
                first={i === 0}
                last={i === layers.length - 1}
                onDraw={() => {
                  doc.chooseLayer(layer.id)
                  bumpInk()
                }}
                onHide={() => doc.patchLayer(setHidden(layer, !layer.hidden))}
                onLock={() => doc.patchLayer(setLocked(layer, !layer.locked))}
                onMore={() => setMore(more === layer.id ? null : layer.id)}
                onMove={(dir) => {
                  const m = moved(doc.layers, layer.id, dir)
                  if (m) doc.patchLayer(m)
                }}
                onDelete={() => {
                  controller.commit({
                    ...emptyEdit(),
                    layers: [{ before: layer, after: removed(layer) }],
                  })
                  if (doc.chosenLayer === layer.id) doc.chooseLayer(null)
                  bumpInk()
                  toast(t('ink.layers.deleted'), undo)
                }}
              />
            )
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
          className={
            look === 'v9'
              ? 'lyr9-page'
              : 'flex min-h-11 items-center gap-2 rounded-lg border border-dashed border-line px-3 text-sm text-ink-soft'
          }
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
          className={
            look === 'v9'
              ? 'lyr9-act'
              : 'flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm hover:bg-hover'
          }
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
          className={
            look === 'v9'
              ? 'lyr9-act'
              : 'flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm hover:bg-hover'
          }
        >
          <Icon name="layers" />
          {t('ink.layers.mergeInto', { from: top.name, into: second.name })}
        </button>
      )}
      {look === 'v9' ? null : <hr className="my-0.5 border-line" />}
      {!hidePaper && (
        <ChipRow
          id="paper"
          label={t('ink.paper')}
          value={paper}
          columns={2}
          options={PAPERS.map((p) => ({
            value: p,
            label: t(`ink.paper.${p}`),
          }))}
          onChange={(p) => ink.setPaper(p === 'blank' ? undefined : p)}
        />
      )}
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
  expanded,
}: {
  id: string
  icon: IconName
  label: string
  onClick: () => void
  pressed?: boolean
  disabled?: boolean
  expanded?: boolean
}) {
  return (
    <button
      type="button"
      data-layer-action={id}
      aria-label={label}
      aria-pressed={pressed}
      aria-expanded={expanded}
      disabled={disabled}
      onMouseDown={keepFocus}
      onClick={onClick}
      className="grid size-11 place-items-center rounded-lg text-ink-soft hover:bg-hover hover:text-ink disabled:opacity-40 aria-pressed:text-accent"
    >
      <Icon name={icon} />
    </button>
  )
}

/** One layer row in the approved look: picture, name and strokes, eye, lock and ⋯ (move, delete). */
function V9Row(p: {
  id: string
  name: string
  strokes: number
  drawing: boolean
  hidden: boolean
  locked: boolean
  open: boolean
  first: boolean
  last: boolean
  onDraw: () => void
  onHide: () => void
  onLock: () => void
  onMore: () => void
  onMove: (dir: 'up' | 'down') => void
  onDelete: () => void
}) {
  const { name } = p
  return (
    <li
      data-layer={p.id}
      data-layer-active={p.drawing ? '' : undefined}
      className="lyr9-row"
    >
      <div className="lyr9-main">
        <button
          type="button"
          data-layer-draw
          aria-pressed={p.drawing}
          aria-label={t('ink.layers.draw', { name })}
          className="lyr9-draw"
          onMouseDown={keepFocus}
          onClick={p.onDraw}
        >
          <span className="lyr9-pic" data-on={p.drawing ? '' : undefined}>
            <Icon name={p.drawing ? 'penLine' : 'layers'} size={15} />
          </span>
          <span className="lyr9-text">
            <span className="lyr9-name">
              {name}
              {p.drawing ? (
                <small className="lyr9-here">
                  {' · '}
                  {t('ink.layers.drawingHere')}
                </small>
              ) : null}
            </span>
            <small>{t('ink.layers.strokes', { count: p.strokes })}</small>
          </span>
        </button>
        <IconBtn
          id="visibility"
          icon={p.hidden ? 'eyeOff' : 'eye'}
          label={t(p.hidden ? 'ink.layers.show' : 'ink.layers.hide', { name })}
          pressed={!p.hidden}
          onClick={p.onHide}
        />
        <IconBtn
          id="lock"
          icon="lock"
          label={t(p.locked ? 'ink.layers.unlock' : 'ink.layers.lock', {
            name,
          })}
          pressed={p.locked}
          onClick={p.onLock}
        />
        <IconBtn
          id="more"
          icon="more"
          label={t('ink.layers.more', { name })}
          expanded={p.open}
          onClick={p.onMore}
        />
      </div>
      {p.open ? (
        <div className="lyr9-sub">
          <IconBtn
            id="up"
            icon="chevronUp"
            label={t('ink.layers.up', { name })}
            disabled={p.first}
            onClick={() => p.onMove('up')}
          />
          <IconBtn
            id="down"
            icon="chevronDown"
            label={t('ink.layers.down', { name })}
            disabled={p.last}
            onClick={() => p.onMove('down')}
          />
          <IconBtn
            id="delete"
            icon="trash"
            label={t('ink.layers.delete', { name })}
            onClick={p.onDelete}
          />
        </div>
      ) : null}
    </li>
  )
}
