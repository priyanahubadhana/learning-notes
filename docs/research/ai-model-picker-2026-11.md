# AI model picker and several keys (7 Nov 2026)

Short brief. Search results were thin (vendor pages; Msty, Chatbox and Cursor docs were not reachable), so only what was confirmed or well known is listed.

## What other apps do

- **TypingMind:** your own keys, many providers, one UI to switch model; the one BYO app that shows token count and a cost estimate. Chatbox does not.
- **Raycast AI:** keys are per provider; the model picker puts a key icon next to models served by your own key, so you always see "my key" versus "included". Usage on your key is billed by the provider.
- **OpenRouter / Cursor (known behaviour):** one flat model list with price per million tokens, context size and a "supports images" mark; a default model plus an automatic fallback order when a provider fails.
- **Obsidian Copilot / Msty (known behaviour):** several named model entries, each tied to a provider key; one active model, more can be added.

## What we take

1. Keys are named by the user ("Claude main", "Gemini free"), many per provider; the picker shows which key serves a model (Raycast).
2. One cost badge instead of raw prices (High / Med / Low / Free), with the real price per million tokens as small print (OpenRouter, TypingMind).
3. A vision mark on cards (OpenRouter).
4. One ordered list: first = default, the rest = fallback order (OpenRouter fallbacks). Drag plus Move up/down for keyboards.
5. A per-notebook choice overrides the global default (Study = free Gemini, Private = Claude).

## Prices checked 2026-11-07

- Anthropic (platform.claude.com pricing): Haiku 5.5 $0.10/$0.50, Sonnet 5.5 $2/$10, Opus 5.5 $4/$20 per million tokens.
- Google (aistudio.google.com/docs/pricing): 3.5 Flash-Lite $0.30/$2.50, 3.1 Flash-Lite $0.25/$1.50, 3.6 Flash $0.75/$3.75 (rises 1 Jan 2027); free tier exists for these; free-tier content is used to improve Google products.
- OpenAI: the official page refused the fetch (403). gpt-4o-mini $0.15/$0.60 (checked 6 Nov) and gpt-4.1-mini $0.40/$1.60 come from earlier checks and third-party lists, marked unverified in the table. The GPT-5 family needs `max_completion_tokens` and spends tokens on hidden reasoning, so it is not offered yet.
