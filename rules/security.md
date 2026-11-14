# Security and Data Safety

- Validate inputs (including imported data and settings values).
- Secrets live in `.env` on the PC only, never in Git or the Drive copy. Before launch they move to a secrets manager.
- Run `npm audit` at each session start. Security fixes: right away, then the full tests. Other updates: at phase start only, then the full tests.
- Never lose data: soft deletes, prefer undo/restore over confirmations.
- Login, permissions, HTTPS and the OWASP Top 10 (the most common web security holes) apply: accounts and hosting are live.
- Security review at the end of every phase.
