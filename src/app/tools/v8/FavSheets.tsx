import { useEffect, useMemo, useState } from 'react'
import {
  ArrangeSheet,
  type ArrangeRow,
} from '../../../design/parts/ArrangeSheet'
import {
  CardGroup,
  CardNote,
  SwitchRow,
  Tile,
  TileGroup,
} from '../../../design/parts/CardParts'
import { ClearField } from '../../../design/parts/ClearField'
import { ConfirmDialog } from '../../../design/parts/Dialogs'
import { OnOffChoice } from '../../../design/parts/OnOff'
import { SheetBase } from '../../../design/parts/SheetBase'
import { t, type MessageKey } from '../../../i18n/t'
import { Icon } from '../icons'
import { currentRunner } from '../toolRuntime'
import { FavFace } from './PenFavChip'
import { favName, justAdded, movedId, useFavs } from './favRow'
import {
  KEEPS,
  NAME_MAX,
  addFav,
  currentSetup,
  favs2,
  newFavId,
  presetsOf,
  resetRow,
  rowOf,
  saveFavs,
  withRow,
  type Fav2,
  type Keep,
} from './favs2'
import { V8_TOOL_IDS, v8Icon, type V8ToolId } from './registryV8'
import { metaOf } from '../toolRegistryMeta'
import './favSheets.css'

const k = (key: string) => key as MessageKey

const toast = (message: string, undo?: () => void) =>
  currentRunner().app?.toast(
    message,
    undo
      ? { label: t('v8.bar.undo'), icon: 'undo', onSelect: undo }
      : undefined,
  )

const KEEP_FIELDS: Record<Keep, (keyof Fav2)[]> = {
  type: ['type'],
  colour: ['colour'],
  size: ['size', 'exact'],
  mode: ['mode'],
  shape: ['shape'],
}

/** A setup with only the ticked parts kept. */
function keepOnly(base: Omit<Fav2, 'id' | 'name'>, keeps: readonly Keep[]) {
  const out: Record<string, unknown> = { ...base }
  for (const key of Object.keys(KEEP_FIELDS) as Keep[])
    if (!keeps.includes(key)) for (const f of KEEP_FIELDS[key]) delete out[f]
  return out as Omit<Fav2, 'id' | 'name'>
}

/** The Add form (TB-52): tool, start, ticks, live preview, name, Save. */
export function AddFavSheet({
  anchor,
  tool: first,
  onClose,
}: {
  anchor: HTMLElement | null
  tool: V8ToolId
  onClose: () => void
}) {
  const [tool, setTool] = useState<V8ToolId>(first)
  const [start, setStart] = useState<'current' | 'preset'>('current')
  const [preset, setPreset] = useState(0)
  const [keeps, setKeeps] = useState<Keep[]>([...KEEPS[first]])
  const [name, setName] = useState('')
  const presets = useMemo(() => presetsOf(tool), [tool])
  const draft = useMemo<Fav2>(() => {
    const base =
      start === 'preset' && presets[preset]
        ? presets[preset]
        : currentSetup(tool, keeps)
    return { id: 'draft', ...keepOnly(base, keeps) }
  }, [tool, start, preset, presets, keeps])
  const shownName = name.trim() || favName(draft)

  const pickTool = (id: V8ToolId) => {
    setTool(id)
    setKeeps([...KEEPS[id]])
    setPreset(0)
    if (presetsOf(id).length === 0) setStart('current')
  }
  const toggle = (key: Keep, on: boolean) =>
    setKeeps((cur) => (on ? [...cur, key] : cur.filter((x) => x !== key)))

  const save = () => {
    const fav: Fav2 = {
      ...draft,
      id: newFavId(),
      ...(name.trim() ? { name: name.trim().slice(0, NAME_MAX) } : {}),
    }
    const before = favs2.get()
    const made = addFav(before, fav)
    if (made.result === 'full') {
      toast(t('v8.favs.full'))
      return
    }
    saveFavs(made.list)
    justAdded.set(fav.id)
    toast(t('v8.favs.added', { name: favName(fav) }), () => saveFavs(before))
    onClose()
  }

  return (
    <SheetBase
      title={t('v8.row.add')}
      anchor={anchor}
      onClose={onClose}
      grow
      data-testid="v8-addsheet"
      footer={
        <>
          <button
            type="button"
            className="arr-btn"
            data-testid="v8-add-cancel"
            onClick={onClose}
          >
            <Icon name="close" size={14} /> {t('v8.favs.cancel')}
          </button>
          <span className="arr-spacer" />
          <button
            type="button"
            className="arr-btn arr-primary"
            data-testid="v8-add-save"
            onClick={save}
          >
            <Icon name="check" size={14} /> {t('v8.favs.save')}
          </button>
        </>
      }
    >
      <div className="favs-preview" data-testid="v8-add-preview">
        <span className="v8chip v8chip-fav">
          <FavFace fav={draft} />
          <span className="v8chip-text">{shownName}</span>
        </span>
      </div>
      <CardGroup label={t('v8.favs.name')}>
        <ClearField
          value={name}
          maxLength={NAME_MAX}
          placeholder={favName(draft)}
          aria-label={t('v8.favs.name')}
          clearLabel={t('v8.favs.clearName')}
          data-testid="v8-add-name"
          onChange={(e) => setName(e.target.value)}
          onClear={() => setName('')}
        />
      </CardGroup>
      <CardGroup label={t('v8.favs.tool')}>
        <TileGroup label={t('v8.favs.tool')} columns={3}>
          {V8_TOOL_IDS.map((id) => (
            <Tile
              key={id}
              label={t(k(`v8.tool.${id}`))}
              selected={tool === id}
              testId={`v8-add-tool-${id}`}
              onSelect={() => pickTool(id)}
            >
              <Icon name={v8Icon(id, metaOf(id)?.icon)} size={20} />
            </Tile>
          ))}
        </TileGroup>
      </CardGroup>
      {presets.length > 0 ? (
        <CardGroup label={t('v8.favs.start')}>
          <OnOffChoice<'current' | 'preset'>
            label={t('v8.favs.start')}
            block
            testId="v8-add-start"
            value={start}
            onChange={setStart}
            options={[
              {
                value: 'current',
                label: t('v8.favs.current'),
                testId: 'v8-add-current',
              },
              {
                value: 'preset',
                label: t('v8.favs.preset'),
                testId: 'v8-add-preset',
              },
            ]}
          />
          {start === 'preset' ? (
            <TileGroup label={t('v8.favs.preset')} columns={3}>
              {presets.map((p, i) => (
                <Tile
                  key={i}
                  label={favName({ id: 'p', ...p })}
                  selected={preset === i}
                  testId={`v8-add-preset-${i}`}
                  onSelect={() => setPreset(i)}
                >
                  <FavFace fav={{ id: 'p', ...p }} />
                </Tile>
              ))}
            </TileGroup>
          ) : null}
        </CardGroup>
      ) : null}
      <CardGroup label={t('v8.favs.keeps')}>
        {KEEPS[tool].length === 0 ? (
          <CardNote>{t('v8.favs.noKeeps')}</CardNote>
        ) : (
          KEEPS[tool].map((key) => (
            <SwitchRow
              key={key}
              label={t(k(`v8.favs.keep.${key}`))}
              checked={keeps.includes(key)}
              onChange={(on) => toggle(key, on)}
            />
          ))
        )}
      </CardGroup>
    </SheetBase>
  )
}

/** The Organise sheet (TB-53 to TB-57) on the shared Arrange sheet. */
export function OrganiseFavSheet({
  anchor,
  tool,
  onAdd,
  onReset,
  onDone,
}: {
  anchor: HTMLElement | null
  tool: V8ToolId
  onAdd: () => void
  onReset: () => void
  onDone: () => void
}) {
  const all = useFavs()
  const row = rowOf(all, tool)
  // Every favourite seen while the sheet is open, so a removed one can come back.
  const [seen] = useState(() => new Map<string, Fav2>())
  useEffect(() => {
    for (const f of row) seen.set(f.id, f)
  })
  const rows: ArrangeRow[] = row.map((f) => ({
    id: f.id,
    label: favName(f),
    hint: t(k(`v8.tool.${f.tool}`)),
    preview: <FavFace fav={f} />,
  }))

  const change = (next: ArrangeRow[], moved?: string) => {
    const before = favs2.get()
    const byId = seen
    const nextRow = next
      .map((r) => byId.get(r.id))
      .filter((f): f is Fav2 => !!f)
    saveFavs(withRow(before, tool, nextRow))
    // The sheet names the row whose arrow, menu, key or handle was used.
    const id = movedId(row, nextRow, moved)
    if (id && nextRow.length === row.length)
      toast(t('v8.favs.moved', { name: favName(byId.get(id)!) }), () =>
        saveFavs(before),
      )
  }

  return (
    <ArrangeSheet
      title={t('v8.row.organise')}
      help={t('v8.favs.orgHelp')}
      rows={rows}
      onChange={change}
      onAdd={onAdd}
      addLabel={t('v8.favs.addShort')}
      preview={(list) => (
        <span className="arr-chips">
          {list.map((r) => (
            <span key={r.id} className="v8chip v8chip-fav">
              {r.preview}
              <span className="v8chip-text">{r.label}</span>
            </span>
          ))}
        </span>
      )}
      onReset={onReset}
      isDefault={row.length === 0}
      onDone={onDone}
      anchor={anchor}
    />
  )
}

/** "Reset favourites?" (TB-56): yes clears this row, with Undo. */
export function ResetFavDialog({
  tool,
  onClose,
}: {
  tool: V8ToolId
  onClose: () => void
}) {
  return (
    <ConfirmDialog
      title={t('v8.favs.resetTitle')}
      text={t('v8.favs.resetText')}
      confirmLabel={t('v8.favs.resetYes')}
      danger
      onConfirm={() => {
        const before = favs2.get()
        saveFavs(resetRow(before, tool))
        toast(t('v8.favs.resetDone'), () => saveFavs(before))
        onClose()
      }}
      onCancel={onClose}
    />
  )
}
