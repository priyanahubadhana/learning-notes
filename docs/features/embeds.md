# Embeds (YouTube and links)

Security rules: [rules/security.md](../../rules/security.md). Check them before building.

## Purpose

Lets a note hold a YouTube video next to the notes about it, and lets the user mark moments: watch, insert a timestamp, paste a screenshot, keep going. Any other web address becomes a plain link card.

## How it works

- Block type `embed` (`editor/embed/embedBlock.tsx`, `EmbedView.tsx`; slash menu "Video or link"). Props: `url`, `provider` (`youtube` or `link`), `videoId`, `start` (seconds), `caption` (the card's name; searchable). A new block asks for the address; Enter or Add reads it.
- `embedUrl.ts` (pure, tested): `parseEmbedUrl` reads watch, youtu.be, shorts, embed and live addresses and a start time (`t=` or `start=`; `90`, `1m30s`, `1:30`); any other http or https address is a link card; everything else is refused (javascript:, data:, file:, addresses with a password, spaces, longer than 2,000 characters). `parseTime`, `formatTime`, `videoLink`, `playerSrc`.
- YouTube card: name, address and start time first; **nothing is loaded from YouTube until Play is tapped**. The frame is `https://www.youtube-nocookie.com/embed/<id>` with `enablejsapi=1`, `referrerPolicy="strict-origin-when-cross-origin"` (YouTube refuses frames with no referrer; only the site's address is sent, and only after the tap). Offline the card shows **Needs internet** and Play is disabled.
- While playing: **Insert timestamp** adds a paragraph with a link `▶ 12:34` to `https://www.youtube.com/watch?v=<id>&t=754s` below the card (the time comes from the player's messages, see below; if none arrived in the last 5 seconds a small field asks for the time). **Paste screenshot** reads a picture from the clipboard and adds it below, captioned `▶ 12:34`. A picture pasted or added with `/image` while the video plays gets the same caption (`StampWatcher`, `stampPicture` in the editor's upload).
- `embedClock.ts`: listens to `message` events from the player frame only (checks the origin and the frame window), reads `infoDelivery.currentTime` (the IFrame API's widget channel; no script from YouTube is loaded) and greets the frame with `{event:'listening'}` for ten seconds. Best effort: the web cannot grab video frames from a frame, and some devices may not report the time, so typing it always works.
- `public/_headers`: `frame-src https://www.youtube-nocookie.com` added to the CSP (nothing else may be framed).

## Edge cases

- A deleted or damaged value (empty `url`) shows the "add an address" box; the stored block is untouched.
- Read-only pages show the card and the player, without the add and insert buttons.
- A video that YouTube does not allow to be embedded shows YouTube's own message inside the frame.
- Anchors `{ type: 'time' }` on annotations (C1) are not built here; the caption and the link carry the time for now.

## Security check

- The address is parsed with `URL`; only http and https are kept; link cards open with `rel="noopener noreferrer"` in a new tab. No `javascript:` or `data:` address can be stored through the box.
- The frame is the only third-party content; `frame-src` allows that one host. The app sends nothing to YouTube before the tap.
- Messages are accepted only from the player's origin and window.

## Tests

`embed.test.ts` (URL forms, refusals, times, message origin and freshness, stamps); `e2e/embed.spec.ts` (card then Play, offline, timestamp from the player and typed, picture caption, link card, refused address).
