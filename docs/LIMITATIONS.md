# Known Limitations

- **Pages can't be dragged** in the sidebar tree (notebooks can).
- **Safari on Windows is slow in tests:** run WebKit tests with `--workers=2 --timeout=120000`. One touch-drag test runs only in Chrome. Two WebKit tests still fail on robot typing and selecting in the editor; the owner confirmed both features work on the real iPad. Look and feel on real devices is checked by hand.
- **First load size:** about 320 KB after the split on 2026-11-01.
- **Hindi editor menus:** BlockNote has no Hindi menus yet.
- **Spanish and Hindi** need native-speaker review.
- **Data lives in one browser:** no sync yet; move it with Save everything and Open saved file.
- **Delete forever keeps pictures:** page history is erased, but no code in Trash erases picture files. Fix before sync.
- **Same-spot inserts:** two devices adding a block at the same spot get the same order key, and a later insert between them fails. One window per page now prevents this on one device; fix before sync (see RESEARCH.md).
- **Replace from older files:** a full save made by an older database version cannot replace the notes (it can be added as copies). Bringing its rows through the upgrade steps is built when database version 13 is made. Restoring holds the whole file in memory while checking it.
- **Formatting bar on touch:** the docked bar is built from tests and screenshots in Chrome; how it feels with the real iPad keyboard, the iPad shortcut bar and the Pencil is checked by hand. The bottom bar rises with the keyboard through the browser's visual viewport, which Safari reports a little late. Hover tips and shortcut hints apply to the docked bar only.
- **Two windows:** a read-only window does not refresh by itself, and page titles are not locked.
- **Update bar:** tested by unit tests only; a real update is the first full check.
- **Manual upload:** Cloudflare cannot turn it off, so a daily check catches it instead.
