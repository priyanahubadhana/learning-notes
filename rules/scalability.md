# Scalability

- Fast for heavy users (e.g. 50,000 cards, large notebooks).
- Speed tests for key paths (e.g. the 10,000-card review queue test).
- Queries go through database indexes, not full scans.
- Design so many users and multi-device sync can plug in later without a rebuild (device UUIDs, soft deletes, timestamps, service layer).
- General building blocks, not hard-coded features.
