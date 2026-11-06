import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState, type CSSProperties } from 'react'
import { db } from '../../core/db'
import {
  FontError,
  listFonts,
  removeFont,
  saveFont,
} from '../../core/fontService'
import { t, type MessageKey } from '../../i18n/t'
import { FileButton } from '../../share/FileButton'
import { ensureFont, forgetFont } from './fonts'
import {
  BUILT_IN_FONTS,
  fontStack,
  isCustomFont,
  type BuiltInFont,
  type ReadingFont,
} from './readingPrefs'

/**
 * The font choices as tiles, each showing the user's own sentence in that
 * font, plus "Import font". Used by the reading Aa sheet and the note Style
 * card. `none` is the value that means "no own font" ("app" for reading,
 * "default" for notes).
 */

/** The system Serif and Sans stay valid values but have no tile (H1). */
const TILE_FONTS = BUILT_IN_FONTS.filter(
  (f): f is Exclude<BuiltInFont, 'serif' | 'sans'> =>
    f !== 'serif' && f !== 'sans',
)

const label = (font: string) => t(`font.name.${font}` as MessageKey)

export function FontTiles<T extends ReadingFont | 'default'>({
  value,
  none,
  onPick,
}: {
  value: T
  none: 'app' | 'default'
  onPick: (font: T) => void
}) {
  const customs = useLiveQuery(() => listFonts(db), [], [])
  const [sample, setSample] = useState(() => t('reading.fontSample'))
  const [error, setError] = useState('')

  // Previewing loads the fonts (once); they are part of the app's files.
  useEffect(() => {
    for (const font of TILE_FONTS) void ensureFont(font)
    for (const c of customs) void ensureFont(`custom:${c.id}`)
  }, [customs])

  const tiles: { id: ReadingFont | 'default'; name: string }[] = [
    { id: none, name: t('font.name.none') },
    ...TILE_FONTS.map((f) => ({ id: f, name: label(f) })),
    ...customs.map((c) => ({
      id: `custom:${c.id}` as ReadingFont,
      name: c.name,
    })),
  ]
  const style = (id: ReadingFont | 'default'): CSSProperties =>
    id === none
      ? {}
      : { fontFamily: fontStack(id as Exclude<ReadingFont, 'app'>) }

  return (
    <div className="grid gap-1.5 px-1">
      <input
        type="text"
        value={sample}
        maxLength={80}
        aria-label={t('font.sample')}
        onChange={(e) => setSample(e.target.value)}
        className="min-h-11 rounded-lg border border-line bg-bg px-2 text-sm"
      />
      <div
        role="radiogroup"
        aria-label={t('main.card.text.font')}
        data-card-chips="font"
        className="grid grid-cols-2 gap-1"
      >
        {tiles.map((tile) => {
          const on = tile.id === value
          return (
            <button
              key={tile.id}
              type="button"
              role="radio"
              aria-checked={on}
              aria-label={tile.name}
              data-chip={tile.id}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onPick(tile.id as T)}
              className={`flex min-h-11 min-w-0 flex-col items-start justify-center gap-0.5 rounded-lg border px-2 py-1 text-start ${
                on
                  ? 'border-accent bg-hover text-accent'
                  : 'border-line text-ink hover:bg-hover'
              }`}
            >
              <span className="text-[11px] font-semibold">{tile.name}</span>
              <span
                aria-hidden="true"
                style={style(tile.id)}
                className="w-full truncate text-sm"
              >
                {sample}
              </span>
            </button>
          )
        })}
      </div>
      <FileButton
        label={t('font.import')}
        hint={t('font.licence')}
        accept=".ttf,.otf,.woff2"
        onFile={(file) => {
          setError('')
          saveFont(db, file)
            .then((font) => onPick(`custom:${font.id}` as T))
            .catch((e: unknown) =>
              setError(e instanceof FontError ? e.message : t('font.badType')),
            )
        }}
      />
      {isCustomFont(value) && (
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            const id = value.slice(7)
            forgetFont(value)
            void removeFont(db, id).then(() => onPick(none as T))
          }}
          className="min-h-11 rounded-lg border border-line px-3 text-sm hover:bg-hover"
        >
          {t('font.remove')}
        </button>
      )}
      {error && (
        <p role="alert" className="text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  )
}
