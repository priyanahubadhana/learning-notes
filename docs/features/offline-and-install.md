# Offline, install and updates

Security rules: [rules/security.md](../../rules/security.md). Check them before building.

## Purpose

The app is hosted, can be installed like a normal app, opens with no internet, and tells the user how safe the notes on this device are.

## How it works

- `public/manifest.webmanifest`, icons and `index.html` tags give the app its name and icon. The address, `id` and `start_url` must not change: installed iPads may never pick up changes, and notes do not follow a new address.
- `vite-plugin-pwa` (`vite.config.ts`) builds a service worker that keeps the whole app on the device.
- `src/main.tsx` registers it and looks for a new version when the app opens and whenever it comes to the front. `src/app/updates.ts` holds the offer; `src/App.tsx` shows it, repeated when the app returns. Only the user's tap restarts the app, and the editor keeps unsaved text across that restart.
- `.github/workflows/ci.yml`: the `deploy` job publishes to Cloudflare Pages only after `checks` passes on `main`. It does nothing until the owner adds the two secrets.
- Screens in `src/App.tsx` load on demand with `lazy()`.
- Settings, "This device" (`src/settings/DeviceSection.tsx`): storage protection, last backup file, how to install.
- `src/app/errors.ts`: a full device shows a message at most once a minute; a database that will not open shows a retry screen in `src/App.tsx`.
- `src/app/ErrorBoundary.tsx` guards the page area and the whole app: a screen that fails shows Go home and Save everything (`share/saveEverything.ts`, loaded with the app so it works when a file cannot download). `src/app/chunkReload.ts` reloads once, at most every 30 seconds, when a screen's file fails to download.
- The update offer shows in `app/UpdateBar.tsx`, not as a toast. × hides it until the next app start (`dismissUpdateOffer`).

## Edge cases

- Safari and the installed app keep separate notes, so the install steps come first.
- A missed update offer returns next time the app comes to the front.
- A failed read is never shown as an empty app.
- The installed iPad app is not cleared by Safari's 7-day rule, but storage pressure can still remove data unless the browser protects it.

- iPadOS 26 blurs about the top 70px of installed web apps, and nothing turns this off. In the installed iPad app the top bar and sidebar start 36px lower (`--top-clear` in `src/index.css`). An invisible solid strip along the top edge was tried first and did not help on the real iPad. Apple does not document this blur, so a later iPadOS may change it.

## Security check

- `public/_headers` sets the content security policy, HSTS, no framing, no sniffing and no referrer. No inline scripts (`public/theme-boot.js`). The preview server uses the same headers, so tests run under them.
- `img-src` and `media-src` allow `https:` so pictures linked by address still show; those pictures tell their host when they load.
- The Cloudflare token lives only in GitHub Secrets.
- Deletes: none here.

## Tests

`src/app/updates.test.ts`, `src/app/errors.test.ts`; e2e: `offline.spec.ts` (built app: offline load, security rules), `deviceSafety.spec.ts`. A real update and the live headers are checked on the live address.
