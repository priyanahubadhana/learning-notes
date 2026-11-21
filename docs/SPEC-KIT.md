# Spec Kit (how it is set up here)

GitHub Spec Kit gives the commands `/speckit-constitution`, `specify`, `clarify`, `plan`, `tasks`, `analyze`, `checklist`. Method: docs/METHOD-v2.md ("Tools"). Task: PC-1.M2.

- **Version pinned:** `v1.4.3` (file `.specify/VERSION`; commit 980b3d0). Installed with `uvx --from git+https://github.com/github/spec-kit.git@v1.4.3 specify init --here --force --non-interactive --integration claude --ignore-agent-tools`. Free, no account. To upgrade: change the tag, re-run, review the diff.
- **One spec template.** The source is `docs/features/_TEMPLATE.md` (both layers and the confirm sheet). Spec Kit reads its project override `.specify/templates/overrides/spec-template.md`, which is a copy made by `node scripts/sync-spec-template.mjs` (`npm run check:spec-template` fails on drift). Never edit the copy.
- **Part cards:** `docs/features/parts/_TEMPLATE-part.md` stays where it is; Spec Kit has no part-card step.
- **Constitution:** `.specify/memory/constitution.md` only points at `CLAUDE.md`, `rules/` and the design docs. No rule text is copied.
- **Implement is not used.** `.claude/skills/speckit-implement/SKILL.md` is disabled (`user-invocable: false`, `disable-model-invocation: true`, note at top). Spec Kit's manifest hash for it will show "modified"; keep it that way on upgrades.
- **Written into `.claude/`:** only `.claude/skills/speckit-{analyze,checklist,clarify,constitution,converge,implement,plan,specify,tasks}/SKILL.md` (new). `CLAUDE.md`, `.claude/settings.json`, agents, hooks and commands were not touched.
- Feature specs still live in `docs/features/`. Spec Kit's own `specs/` folder is not used.
- **Also disabled:** `speckit-converge` (feeds implement; both flags and note) and the implement step in `.specify/workflows/speckit/workflow.yml` (removed). `speckit-constitution` is model-disabled so no agent rewrites it with rule text.
