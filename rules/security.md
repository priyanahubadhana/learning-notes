# Security and Data Safety

- Validate inputs (including imported data and settings values).
- Secrets live in `.env`, never committed.
- Keep dependencies up to date; check for known vulnerabilities.
- Never lose data: soft deletes, prefer undo/restore over confirmations.
- Login, permissions, HTTPS and the OWASP Top 10 (the most common web security holes) apply once accounts or hosting arrive (Phase 6–7).
- Security review at the end of every phase.
