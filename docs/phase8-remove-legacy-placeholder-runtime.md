# Phase 8 — Remove legacy placeholder runtime

The canonical grammar catalogue no longer supports implicit placeholder creation.

This phase removes the last database objects that existed only to support or
guard the old placeholder workflow:

- `public.ensure_canonical_grammar(uuid,text,text)`
- `public.reject_sentence_discovered_grammar_placeholder()`
- `japanese_grammar_guides_reject_sentence_placeholder` trigger

These are no longer needed because:

- sentence import resolves only existing complete canonical guides;
- clarifications resolve only existing complete guides;
- related grammar and variant related-canonical links resolve only existing complete guides;
- explicit `grammar_guide` import is now the only supported way to create a new canonical guide.

## Live verification

After applying this migration directly to Supabase:

- canonical guides: 653
- pending / placeholder guides: 0
- legacy placeholder helper exists: false
- legacy reject function exists: false
- legacy reject trigger exists: false

No grammar data was modified.

## Frontend note

Phase 7B already retired the Pending Guides user experience. The remaining
pending-specific branches in `repository.js` are now dead code only; they no
longer correspond to a supported database state. They can be removed during the
final frontend consolidation/regression pass without changing behavior.
