# QA report: <engine> on <checkpoint tag>

Engine: Codex | Cursor | Antigravity · Working copy: <path> · Head: `git rev-parse HEAD` · Date: <UTC>
Brief followed: BRIEFS.md section <n> · Scope: <specs, F-ids, screens or files the brief named>

## Executed

- Ran: <exact commands, exit codes, pass counts> (only what you actually ran)
- Could not run: <what and why>
- Browsed: <URL, browser, account, notebook> (Antigravity)

## Findings

Group under these headings, in this order; leave a heading empty rather than drop it. No duplicates across groups.

1. Confirmed bugs
2. Potential bugs
3. Confirmed security vulnerabilities
4. Potential security risks
5. Performance issues
6. Usability problems
7. Specification inconsistencies
8. Improvement suggestions (label each "preference" unless a spec or the quality standard backs it)

Each finding:

```
### <ENGINE>-<nn> · <short title>
Feature: F-xxx <name> · Spec: docs/features/<file>.md "<row or line>"
Category: bug | security | performance | usability | spec-conflict | preference
Severity: Critical | High | Medium | Low · Confidence: Confirmed | Probable | Unverified
Actual: <what happens>
Expected: <what the spec or picture says>
Steps: 1. … 2. … 3. …
Evidence: <file:line, test name and output, screenshot path in the reports folder, log excerpt>
Root-cause hypothesis: <one or two lines, or "none">
Recommended correction: <in words; never a patch applied>
Architectural impact: none | local | shared code | data format
Suggested regression test: <one line: where, what it proves>
```

## Not a finding

Things checked and found right (one line each). This keeps the next auditor from re-checking them.

## Rules check

- [ ] I changed nothing in the working copy (`git status` clean, HEAD detached).
- [ ] No secrets, tokens or private data in this report (the repository is public).
- [ ] Every finding names an F-id and a spec or picture.
