# Grammar guide batch identity fix

## Changelog

- Changed grammar-guide upserts to select the current user's guide by canonical `pattern_key`; incoming slugs no longer choose the row being updated.
- Added a conflicting-slug guard so a slug owned by another canonical guide fails instead of overwriting that guide.
- Added `upsert_canonical_grammar_guides(jsonb)` for atomic batches of 1–10 guides.
- Added per-guide batch diagnostics: incoming canonical/slug and returned guide ID, pattern, status, and placeholder state.
- Added frontend canonical return checks and refreshed-library completion checks before success is shown or the import draft is cleared.
- Added regression coverage for four distinct placeholder IDs, sequential completion, atomic batch completion, mismatch reporting, incomplete reload reporting, and transaction rollback.

## Apply

Run `migrations/20260907_grammar_guide_batch_identity.sql` in Supabase before deploying the updated `repository.js`.

## Smoke-test checklist

- Create pending placeholders for `〜ている`, `〜たら`, `〜てくる`, and `〜てしまう`; record their IDs.
- Import four full guides as one JSON array.
- Confirm all four guides become Complete and keep their original IDs.
- Confirm each guide displays its own imported meaning, formation, usage, examples, and references.
- Confirm Pending Guides no longer lists the four completed guides.
- Re-import the same array and confirm no duplicate canonical rows are created.
- Import a batch containing a stale/colliding slug and confirm the batch fails without changing any guide.
- Simulate or inspect a mismatched RPC return and confirm the UI names the expected and returned canonicals.
- Confirm a guide left Pending after reload produces an incomplete-batch message listing that canonical and retains the JSON draft.
- Confirm sentence grammar links and sentence importing behave unchanged.
