# Known Limitations

- **Pages can't be dragged** in the sidebar tree (notebooks can).
- **Safari on Windows is slow in tests:** run WebKit tests with `--workers=2 --timeout=120000`. One touch-drag test runs only in Chrome. Two WebKit tests still fail on robot typing and selecting in the editor; the owner confirmed both features work on the real iPad. Look and feel on real devices is checked by hand.
- **First load size:** about 320 KB after the split on 2026-11-01.
- **Hindi editor menus:** BlockNote has no Hindi menus yet.
- **Spanish and Hindi** need native-speaker review.
- **Data lives in one browser:** no sync yet; move it with Save everything and Open saved file.
- **Delete forever keeps pictures:** page history is erased, but no code in Trash erases picture files. Fix before sync.
- **Same-spot inserts:** two devices adding a block at the same spot get the same order key, and a later insert between them fails. One window per page now prevents this on one device; fix before sync (see RESEARCH.md).
- **Backup limits:** Save everything leaves out page history, settings, saved searches and the Trash, and journal days return as an ordinary notebook. A file over 200 MB saves but cannot be opened again.
- **Two windows:** a read-only window does not refresh by itself, and page titles are not locked.
- **Update bar:** tested by unit tests only; a real update is the first full check.
- **Manual upload:** Cloudflare cannot turn it off, so a daily check catches it instead.
