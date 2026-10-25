# Global (any language, any device)

- No hard-coded user-facing text: use `t("key")` backed by one English strings file; plurals supported; dates/numbers via `Intl`.
- Store times in UTC.
- RTL-safe layout (right-to-left languages).
- Accessibility: full keyboard use, screen-reader labels, sufficient contrast.
- Safe data upgrades: every database change has an upgrade path and an upgrade test; never lose existing data.
- Touch- and phone-friendly: large tap targets, no hover-only actions, works in portrait and landscape.
- Built to work on all platforms (web now; iPhone, iPad, Android, Mac later).
