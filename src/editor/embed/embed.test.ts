// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import {
  currentVideoTime,
  listenToPlayer,
  resetEmbedClock,
  stampLabel,
  stampPicture,
  takeStamp,
  timeFromMessage,
} from './embedClock'
import {
  embedProps,
  formatTime,
  frameSrc,
  parseEmbedUrl,
  parseTime,
  playerSrc,
  PLAYER_ORIGIN,
  videoLink,
} from './embedUrl'

const ID = 'dQw4w9WgXcQ'

describe('parseEmbedUrl', () => {
  it('reads the usual YouTube forms and their start time', () => {
    const forms = [
      `https://www.youtube.com/watch?v=${ID}`,
      `youtube.com/watch?v=${ID}&feature=share`,
      `https://m.youtube.com/watch?v=${ID}`,
      `https://youtu.be/${ID}`,
      `https://www.youtube.com/embed/${ID}`,
      `https://www.youtube.com/shorts/${ID}`,
      `https://www.youtube-nocookie.com/embed/${ID}`,
    ]
    for (const f of forms) {
      expect(parseEmbedUrl(f)).toMatchObject({
        provider: 'youtube',
        videoId: ID,
        start: 0,
      })
    }
    expect(parseEmbedUrl(`https://youtu.be/${ID}?t=90`)).toMatchObject({
      start: 90,
      url: `https://www.youtube.com/watch?v=${ID}&t=90s`,
    })
    expect(
      parseEmbedUrl(`https://www.youtube.com/watch?v=${ID}&t=1m30s`),
    ).toMatchObject({ start: 90 })
    expect(
      parseEmbedUrl(`https://www.youtube.com/embed/${ID}?start=12`),
    ).toMatchObject({ start: 12 })
  })

  it('makes other web addresses plain link cards', () => {
    expect(parseEmbedUrl('https://example.com/a?b=1#top')).toEqual({
      provider: 'link',
      url: 'https://example.com/a?b=1',
    })
    expect(parseEmbedUrl('example.com/page')).toEqual({
      provider: 'link',
      url: 'https://example.com/page',
    })
    // A YouTube address that is not a video is just a link.
    expect(parseEmbedUrl('https://www.youtube.com/@someone')).toMatchObject({
      provider: 'link',
    })
    // A bad video id is just a link too.
    expect(parseEmbedUrl('https://youtu.be/short')).toMatchObject({
      provider: 'link',
    })
  })

  it('refuses anything unsafe or unreadable', () => {
    for (const bad of [
      '',
      '   ',
      'javascript:alert(1)',
      'data:text/html,<b>x</b>',
      'file:///etc/passwd',
      'ftp://example.com/a',
      'https://user:pass@example.com/',
      'two words',
      'localhost',
      `https://example.com/${'a'.repeat(2100)}`,
    ]) {
      expect(parseEmbedUrl(bad), bad).toBeNull()
    }
  })
})

describe('time helpers', () => {
  it('reads and writes times', () => {
    expect(parseTime('754')).toBe(754)
    expect(parseTime('12:34')).toBe(754)
    expect(parseTime('1:02:03')).toBe(3723)
    expect(parseTime('1h2m3s')).toBe(3723)
    expect(parseTime('90s')).toBe(90)
    expect(parseTime('12:99')).toBeNull()
    expect(parseTime('abc')).toBeNull()
    expect(parseTime('')).toBeNull()
    expect(formatTime(754.9)).toBe('12:34')
    expect(formatTime(3723)).toBe('1:02:03')
    expect(formatTime(-5)).toBe('0:00')
  })

  it('builds the timestamp link and the player address', () => {
    expect(videoLink(ID, 754)).toBe(
      `https://www.youtube.com/watch?v=${ID}&t=754s`,
    )
    expect(videoLink(ID)).toBe(`https://www.youtube.com/watch?v=${ID}`)
    const src = playerSrc(ID, 30)
    expect(src.startsWith(`${PLAYER_ORIGIN}/embed/${ID}?`)).toBe(true)
    expect(src).toContain('start=30')
    expect(src).toContain('enablejsapi=1')
  })
})

describe('the play clock', () => {
  afterEach(() => resetEmbedClock())

  it('reads the time from a player message', () => {
    const msg = JSON.stringify({
      event: 'infoDelivery',
      info: { currentTime: 754.2 },
    })
    expect(timeFromMessage(msg)).toBe(754.2)
    expect(
      timeFromMessage({ event: 'infoDelivery', info: { currentTime: 3 } }),
    ).toBe(3)
    expect(timeFromMessage('not json')).toBeNull()
    expect(timeFromMessage({ event: 'onReady' })).toBeNull()
    expect(
      timeFromMessage({ event: 'infoDelivery', info: { currentTime: -1 } }),
    ).toBeNull()
  })

  it('only trusts messages from the player frame, and only while fresh', () => {
    const frame = document.createElement('iframe')
    document.body.append(frame)
    const stop = listenToPlayer(frame, ID)
    const send = (origin: string, source: MessageEventSource | null) =>
      window.dispatchEvent(
        new MessageEvent('message', {
          data: JSON.stringify({
            event: 'infoDelivery',
            info: { currentTime: 100 },
          }),
          origin,
          source,
        }),
      )
    // Wrong origin, wrong window: ignored.
    send('https://evil.example', frame.contentWindow)
    send(PLAYER_ORIGIN, window)
    expect(currentVideoTime()).toBeNull()
    send(PLAYER_ORIGIN, frame.contentWindow)
    expect(currentVideoTime(ID)?.seconds).toBe(100)
    expect(currentVideoTime('otherVideo1')).toBeNull()
    expect(stampLabel(ID)).toBe('▶ 1:40')
    // Old news is not a play time.
    expect(currentVideoTime(ID, Date.now() + 60_000)).toBeNull()
    stop()
    frame.remove()
  })

  it('keeps a caption for a picture until it is taken', () => {
    stampPicture('lnimg:a', '▶ 1:40')
    expect(takeStamp('lnimg:a')).toBe('▶ 1:40')
    expect(takeStamp('lnimg:a')).toBeUndefined()
  })
})

describe('Vimeo, Loom and video files', () => {
  it('reads Vimeo addresses, public and unlisted', () => {
    expect(parseEmbedUrl('https://vimeo.com/76979871')).toEqual({
      provider: 'vimeo',
      videoId: '76979871',
      hash: '',
      start: 0,
      url: 'https://vimeo.com/76979871',
    })
    expect(
      parseEmbedUrl('https://vimeo.com/76979871/abcdef1234'),
    ).toMatchObject({ provider: 'vimeo', hash: 'abcdef1234' })
    expect(
      parseEmbedUrl('https://player.vimeo.com/video/76979871?h=abcdef1234'),
    ).toMatchObject({ provider: 'vimeo', hash: 'abcdef1234' })
    expect(
      parseEmbedUrl('https://vimeo.com/channels/staff/76979871'),
    ).toMatchObject({ provider: 'vimeo', videoId: '76979871' })
    expect(parseEmbedUrl('https://vimeo.com/76979871#t=1m5s')).toMatchObject({
      start: 65,
    })
    // Not a video: a plain link.
    expect(parseEmbedUrl('https://vimeo.com/staff')).toMatchObject({
      provider: 'link',
    })
  })
  it('reads Loom share and embed addresses', () => {
    const id = 'a'.repeat(32)
    expect(parseEmbedUrl(`https://www.loom.com/share/${id}`)).toEqual({
      provider: 'loom',
      videoId: id,
      start: 0,
      url: `https://www.loom.com/share/${id}`,
    })
    expect(parseEmbedUrl(`https://loom.com/embed/${id}?t=30`)).toMatchObject({
      provider: 'loom',
      start: 30,
    })
    expect(parseEmbedUrl('https://www.loom.com/share/short')).toMatchObject({
      provider: 'link',
    })
  })
  it('accepts direct .mp4 and .webm over https only', () => {
    expect(parseEmbedUrl('https://cdn.example.com/a/clip.mp4?x=1')).toEqual({
      provider: 'video',
      url: 'https://cdn.example.com/a/clip.mp4?x=1',
    })
    expect(parseEmbedUrl('https://cdn.example.com/clip.WEBM')).toMatchObject({
      provider: 'video',
    })
    expect(parseEmbedUrl('http://cdn.example.com/clip.mp4')).toMatchObject({
      provider: 'link',
    })
    expect(parseEmbedUrl('https://example.com/page.html')).toMatchObject({
      provider: 'link',
    })
  })
  it('frames only the allow-listed hosts', () => {
    expect(
      frameSrc({ url: 'https://vimeo.com/76979871/abcdef1234', start: 12 }),
    ).toBe(
      'https://player.vimeo.com/video/76979871?dnt=1&autoplay=1&h=abcdef1234#t=12s',
    )
    const id = 'b'.repeat(32)
    expect(frameSrc({ url: `https://www.loom.com/share/${id}` })).toBe(
      `https://www.loom.com/embed/${id}?autoplay=1&hide_owner=true`,
    )
    expect(frameSrc({ url: 'https://evil.example/x.mp4' })).toBeNull()
    expect(frameSrc({ url: 'https://example.com/' })).toBeNull()
  })
  it('builds block props', () => {
    expect(embedProps(parseEmbedUrl('https://example.com/a')!)).toEqual({
      url: 'https://example.com/a',
      provider: 'link',
    })
    expect(
      embedProps(parseEmbedUrl('https://cdn.example.com/clip.mp4')!),
    ).toEqual({ url: 'https://cdn.example.com/clip.mp4', provider: 'video' })
  })
})
