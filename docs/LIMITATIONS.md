# Known Limitations

- **Pages can't be dragged** in the sidebar tree (notebooks can).
- **Safari on Windows is slow in tests:** run WebKit tests with `--workers=2 --timeout=120000`. One touch-drag test runs only in Chrome. Two WebKit tests still fail (`#` tags and Revise label buttons, both in the editor) and are checked by hand on the iPad. Look and feel on real devices is checked by hand.
- **First load size:** about 1.8 MB of JavaScript before compression; split it before hosting.
- **Hindi editor menus:** BlockNote has no Hindi menus yet.
- **Spanish and Hindi** need native-speaker review.
- **Data lives in one browser:** no sync yet; move it with Save everything and Restore backup.
- **Delete forever keeps pictures:** page history is erased, but no code in Trash erases picture files. Fix before sync.
- **Same-spot inserts:** two devices adding a block at the same spot get the same order key, and a later insert between them fails. Harmless on one device; fix before sync (see RESEARCH.md).
- **Update offer:** tested in parts and by unit tests; a real update is first checked on the live address.
