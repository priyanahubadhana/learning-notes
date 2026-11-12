# Tool registry (slice 0i)

Security rules: [rules/security.md](../../rules/security.md). Check them before building.

## Purpose

One place that describes every tool, so later screens (bar, "/" menu, command
palette, Settings, AI) read the same facts instead of keeping their own lists.
Slice 0i only builds the lists and their tests. Nothing visible changes and
nothing reads them yet.

Two lists:

1. **App tools** (`src/app/tools/toolRegistryMeta.ts`): extra facts for every
   tool in today's `TOOLS` list and today's main bar (`MAIN_TOOLS`).
2. **AI tools** (`src/aitools/`): slice 0 of
   [the AI tool framework](../design/ai-tool-framework.md) (section 16): the
   registry format, `catalog.gen.json` with its sync script, the plan schema,
   the plan validator and the six existing write tools as registry tools.

## How it works

- When a tool is in today's bar or control panel → it has one entry in the app
  registry with: level (Beginner or Professional), its unlock switch id (if
  Professional), where it shows (`toolbar`, `slash`, `palette`, `settings`),
  can-be-favourite, and an icon.
- When a tool's icon name is missing → the registry gives the fallback icon
  (`more`), never a blank button.
- When someone adds a tool to the bar but not to the registry → a unit test
  fails and names the tool id.
- When the AI catalog is regenerated (`npm run aitools:catalog`) →
  `src/aitools/catalog.gen.json` is rewritten from the registry; a test fails
  if the file is out of date.
- When a plan is checked (`validatePlan(plan, catalog)`) → it returns a list of
  `{ path, message }` errors: an empty list means valid. It never throws, even
  for `null`, numbers, huge or hostile input.
- When a plan names a tool that is not in the catalog, a wrong version, a step
  that depends on a later or missing step, a cycle, a `$from` to a later step
  or an unknown output, or arguments that break the tool's inputs → it is
  refused with the exact path.

## Won't do

- No screen reads either registry yet (later slices).
- No executor, no `stage`, no saving, no AI or network calls of any kind.
- No change to `mcp/` or `supabase/` behaviour; moving `spec.schema.json`
  shapes into named `$defs` waits for the connector-parity slice.
- No new dependency: the validator is hand-written (a small JSON Schema
  subset).

## Edge cases

- Plan bigger than 256 KB, more than 40 steps, deep nesting, prototype keys
  (`__proto__`, `constructor`) and envelope-closing text: refused, not thrown.
- Tool ids are compared as own keys only (no prototype lookups).

## Security check

Plan input is untrusted. The validator reads it without `eval`, without
prototype lookups and with size and depth caps. No secrets, no network.

## Tests

- App registry: same ids as `TOOLS` and `MAIN_TOOLS`; every icon draws.
- AI registry: contract test per tool (complete definition, good example
  passes, broken example fails at the expected path).
- Catalog file is up to date.
- Fuzz: 10,000 random and mutated broken plans: none pass, none throw.
