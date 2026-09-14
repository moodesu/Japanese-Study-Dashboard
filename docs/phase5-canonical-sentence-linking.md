# Phase 5 — Canonical sentence linking

## Goal

The Grammar Library is now the authoritative canonical catalogue.

Personal sentence imports may add or update sentences and attach those examples
to existing canonical guides. They must not create new grammar identities or
pending placeholder guides as an import side effect.

## Behaviour

- Existing duplicate-safe sentence import remains unchanged.
- Existing sentence IDs and unrelated metadata remain preserved on reimport.
- Existing grammar links are still transactionally replaced by the incoming
  `grammar_points` set.
- Surface forms remain annotations (`surface`) and never become canonical IDs.
- Preview resolves every incoming `canonical` against the already-loaded
  Grammar Library.
- If every canonical exists, import proceeds normally.
- If one or more canonicals are missing, Preview blocks the import and lists
  the unresolved canonicals.
- The database trigger is a second-line backstop. A bypassed or stale client
  cannot create a `discovered_from_sentence` pending placeholder.

## Smoke test

1. Import a sentence using known canonicals such as `〜たら` and `〜ている`.
   Preview should show canonical links and Import should succeed.
2. Reimport the same sentence. It should update the existing sentence rather
   than create a duplicate.
3. Change the JSON to a deliberately nonexistent canonical such as
   `〜PHASE5-NOT-A-GRAMMAR`.
   Preview must show "Canonical grammar mismatch" and disable Import.
4. Confirm no guide named `〜PHASE5-NOT-A-GRAMMAR` appears in Grammar Library.
5. Run the two verification queries at the bottom of the migration; both
   should return zero rows.

## Suggested commit

`feat(grammar): make sentence imports canonical-library first`
