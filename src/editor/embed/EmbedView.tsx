import { useContext, useEffect, useRef, useState } from 'react'
import { AppUiContext } from '../../app/appUi'
import { db } from '../../core/db'
import { t } from '../../i18n/t'
import { imageRef } from '../../images/imageRef'
import { saveImage } from '../../images/imageService'
import { currentVideoTime, listenToPlayer, stampLabel } from './embedClock'
import {
  formatTime,
  parseEmbedUrl,
  parseTime,
  playerSrc,
  PLAYER_ORIGIN,
  videoLink,
} from './embedUrl'

/**
 * The embed block (G2a). A YouTube video shows a card first and loads the
 * player (from youtube-nocookie.com) only after a tap, so opening a page
 * sends nothing to YouTube. Offline it says "Needs internet". While it
 * plays, "Insert timestamp" adds a link line at the current time, and "Paste
 * screenshot" adds a picture captioned with that time. Any other address is
 * a plain link card (no live frame).
 */

export interface EmbedProps {
  url: string
  provider: string
  videoId: string
  start: number
  caption: string
}

/** What the view needs from the editor. */
export interface EmbedHostApi {
  isEditable: boolean
  updateBlock: (block: unknown, update: unknown) => unknown
  insertBlocks: (blocks: unknown[], ref: unknown, placement: 'after') => unknown
}

const btn =
  'min-h-11 rounded-lg px-3 text-sm text-ink hover:bg-hover disabled:opacity-40'

export function EmbedView({
  block,
  editor,
}: {
  block: { props: EmbedProps }
  editor: EmbedHostApi
}) {
  const { toast } = useContext(AppUiContext)
  const p = block.props
  const editable = editor.isEditable
  const setProps = (props: Partial<EmbedProps>) =>
    editor.updateBlock(block, { props })

  // ---- an empty block asks for the address ----
  const [draft, setDraft] = useState('')
  const [bad, setBad] = useState(false)
  if (p.url === '') {
    const add = () => {
      const parsed = parseEmbedUrl(draft)
      if (!parsed) {
        setBad(true)
        return
      }
      setProps(
        parsed.provider === 'youtube'
          ? {
              url: parsed.url,
              provider: 'youtube',
              videoId: parsed.videoId,
              start: parsed.start,
            }
          : { url: parsed.url, provider: 'link' },
      )
    }
    return (
      <div
        data-chrome
        data-embed
        contentEditable={false}
        className="w-full rounded-lg border border-line bg-soft p-3"
      >
        {editable ? (
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value)
                setBad(false)
              }}
              onKeyDown={(e) => {
                e.stopPropagation()
                if (e.key === 'Enter') add()
              }}
              placeholder={t('embed.placeholder')}
              aria-label={t('embed.address')}
              aria-invalid={bad}
              className="min-h-11 min-w-0 flex-1 rounded-lg border border-line bg-bg px-3 text-sm"
            />
            <button type="button" className={btn} onClick={add}>
              {t('embed.add')}
            </button>
            {bad && (
              <p role="alert" className="w-full text-sm text-danger">
                {t('embed.bad')}
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted">{t('embed.empty')}</p>
        )}
      </div>
    )
  }

  if (p.provider !== 'youtube' || p.videoId === '') {
    return <LinkCard props={p} editable={editable} setProps={setProps} />
  }
  return (
    <VideoCard
      block={block}
      props={p}
      editor={editor}
      setProps={setProps}
      onToast={toast}
    />
  )
}

function Caption({
  value,
  editable,
  onSave,
}: {
  value: string
  editable: boolean
  onSave: (v: string) => void
}) {
  if (!editable) {
    return value ? (
      <p className="truncate text-sm font-medium">{value}</p>
    ) : null
  }
  return (
    <input
      defaultValue={value}
      key={value}
      maxLength={200}
      placeholder={t('embed.name')}
      aria-label={t('embed.name')}
      onKeyDown={(e) => {
        e.stopPropagation()
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
      }}
      onBlur={(e) => e.target.value !== value && onSave(e.target.value)}
      className="min-h-9 w-full bg-transparent text-sm font-medium outline-none placeholder:text-muted"
    />
  )
}

function LinkCard({
  props,
  editable,
  setProps,
}: {
  props: EmbedProps
  editable: boolean
  setProps: (p: Partial<EmbedProps>) => void
}) {
  return (
    <div
      data-chrome
      data-embed="link"
      contentEditable={false}
      className="w-full rounded-lg border border-line bg-soft px-3 py-2"
    >
      <Caption
        value={props.caption}
        editable={editable}
        onSave={(caption) => setProps({ caption })}
      />
      <a
        href={props.url}
        target="_blank"
        rel="noopener noreferrer"
        className="block min-h-9 truncate py-1.5 text-sm text-accent underline underline-offset-2"
      >
        {props.url}
      </a>
    </div>
  )
}

function VideoCard({
  block,
  props: p,
  editor,
  setProps,
  onToast,
}: {
  block: { props: EmbedProps }
  props: EmbedProps
  editor: EmbedHostApi
  setProps: (p: Partial<EmbedProps>) => void
  onToast: (message: string) => void
}) {
  const editable = editor.isEditable
  const [playing, setPlaying] = useState(false)
  const [online, setOnline] = useState(() => navigator.onLine)
  const [typing, setTyping] = useState(false)
  const [typed, setTyped] = useState('')
  const frame = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])

  // Listen for the play time while the player is open.
  useEffect(() => {
    if (!playing || !frame.current) return
    return listenToPlayer(frame.current, p.videoId)
  }, [playing, p.videoId])

  const insertAfter = (blocks: unknown[]) =>
    editor.insertBlocks(blocks, block, 'after')

  const addTimestamp = (seconds: number) => {
    insertAfter([
      {
        type: 'paragraph',
        content: [
          {
            type: 'link',
            href: videoLink(p.videoId, seconds),
            content: [
              { type: 'text', text: `▶ ${formatTime(seconds)}`, styles: {} },
            ],
          },
          { type: 'text', text: ' ', styles: {} },
        ],
      },
    ])
  }
  const onTimestamp = () => {
    const now = currentVideoTime(p.videoId)
    if (now) addTimestamp(now.seconds)
    else setTyping(true)
  }
  const commitTyped = () => {
    const seconds = parseTime(typed)
    if (seconds === null) {
      onToast(t('embed.badTime'))
      return
    }
    addTimestamp(seconds)
    setTyping(false)
    setTyped('')
  }

  const pasteScreenshot = async () => {
    try {
      const items = await navigator.clipboard.read()
      for (const item of items) {
        const type = item.types.find((x) => x.startsWith('image/'))
        if (!type) continue
        const saved = await saveImage(db, await item.getType(type))
        const label = stampLabel(p.videoId)
        insertAfter([
          {
            type: 'image',
            props: {
              url: imageRef(saved.id),
              ...(label && { caption: label }),
            },
          },
        ])
        if (!label) onToast(t('embed.noTime'))
        return
      }
      onToast(t('embed.noPicture'))
    } catch {
      onToast(t('embed.pasteBlocked'))
    }
  }

  return (
    <div
      data-chrome
      data-embed="youtube"
      contentEditable={false}
      className="w-full overflow-hidden rounded-lg border border-line bg-soft"
    >
      <div className="px-3 pt-2">
        <Caption
          value={p.caption}
          editable={editable}
          onSave={(caption) => setProps({ caption })}
        />
        <p className="truncate pb-1 text-xs text-muted">
          {t('embed.youtube')} · {p.url}
          {p.start > 0 && ` · ${formatTime(p.start)}`}
        </p>
      </div>
      {playing ? (
        <div className="aspect-video w-full bg-black">
          <iframe
            ref={frame}
            title={p.caption || t('embed.youtube')}
            src={playerSrc(p.videoId, p.start)}
            className="size-full border-0"
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            // YouTube needs to know which site embeds it; this sends only
            // the site's address (nothing else), and only after a tap.
            referrerPolicy="strict-origin-when-cross-origin"
            data-origin={PLAYER_ORIGIN}
          />
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2 px-3 pb-2">
          <button
            type="button"
            className="min-h-11 rounded-lg bg-accent px-4 text-sm font-medium text-white disabled:opacity-40"
            disabled={!online}
            onClick={() => setPlaying(true)}
          >
            ▶ {t('embed.play')}
          </button>
          {!online && (
            <>
              <span role="status" className="text-sm text-muted">
                {t('embed.needsInternet')}
              </span>
              <button
                type="button"
                data-testid="embed-copy-link"
                className={btn}
                onClick={() => {
                  void navigator.clipboard
                    ?.writeText(p.url)
                    .then(() => onToast(t('embed.linkCopied')))
                }}
              >
                {t('embed.copyLink')}
              </button>
            </>
          )}
        </div>
      )}
      {playing && (
        <div className="flex flex-wrap items-center gap-1 border-t border-line px-2 py-1">
          {editable && (
            <>
              <button type="button" className={btn} onClick={onTimestamp}>
                {t('embed.timestamp')}
              </button>
              <button
                type="button"
                className={btn}
                onClick={() => void pasteScreenshot()}
              >
                {t('embed.screenshot')}
              </button>
            </>
          )}
          {typing && (
            <span className="flex items-center gap-1">
              <input
                autoFocus
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                onKeyDown={(e) => {
                  e.stopPropagation()
                  if (e.key === 'Enter') commitTyped()
                  if (e.key === 'Escape') setTyping(false)
                }}
                placeholder={t('embed.timePlaceholder')}
                aria-label={t('embed.time')}
                className="min-h-11 w-28 rounded-lg border border-line bg-bg px-2 text-sm"
              />
              <button type="button" className={btn} onClick={commitTyped}>
                {t('embed.insert')}
              </button>
            </span>
          )}
          <button
            type="button"
            className={`${btn} ml-auto`}
            onClick={() => setPlaying(false)}
          >
            {t('embed.close')}
          </button>
        </div>
      )}
    </div>
  )
}
