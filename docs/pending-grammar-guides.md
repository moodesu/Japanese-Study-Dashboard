# Pending grammar guides

## Changelog

- Records canonical placeholders as explicit `pending` guides with discovery origins and first/last encounter timestamps.
- Enforces one canonical guide per user and canonical pattern as a database backstop.
- Derives pending priority from direct sentence links, linked-sentence count, and recency.
- Adds Grammar Library filters for All, Complete, Pending, and Encountered in my sentences.
- Adds pending-guide selection and a ready-to-paste guide-generation prompt, capped at 10 guides per batch.
- Accepts one grammar guide or a JSON array of up to 10 grammar guides and previews new, pending-completion, and complete-update operations.
- Completes placeholders through the existing guide upsert, preserving guide IDs and sentence links.
- Adds pending context and prompt/navigation actions to placeholder guide pages.
- Keeps Related grammar and combined-form guide navigation compact with horizontal ruby/furigana labels.

## Apply

Run `migrations/20260906_pending_grammar_guides.sql` in Supabase after the existing duplicate-safe sentence-import migration, then deploy the changed application files.

If the migration reports duplicate canonical patterns, remove the disposable duplicate guide rows and rerun it.

## Smoke-test checklist

- Import a sentence linking `〜ている`, `〜たら`, and `〜てくる`; confirm Pending shows three unique guides.
- Import another sentence linking `〜ている` and `〜てしまう`; confirm Pending shows four guides and `〜ている` reports two linked sentences.
- Confirm Pending sorts direct sentence encounters before related-only placeholders.
- Test All, Complete, Pending, and Encountered in my sentences filters and browser Back/Forward behavior.
- Select one, several, and all visible pending guides; copy the prompt and verify the exact canonical labels.
- Paste a JSON array of the selected full guides; confirm Preview distinguishes pending completions, new guides, and complete-guide updates.
- Import the batch; confirm the placeholders retain their IDs, sentence links remain, and Pending becomes empty for those guides.
- Re-import the same batch; confirm no duplicate canonical guides are created.
- Open a pending guide; confirm linked-sentence count, View pending guides, and single-guide prompt copy.
- Toggle furigana and check Related grammar labels such as `来る` and `〜始める` remain horizontal on desktop and mobile.

## Suggested commit message

`feat(grammar): add managed pending guide workflow`
