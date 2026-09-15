# Phase 6D — Strict canonical sentence import

Phase 6D removes the last legacy placeholder path from the sentence-import RPC.

## Database behaviour

`import_repository_with_canonical_grammar()` now:

- resolves `canonical` only by the existing canonical `pattern_key`;
- rejects unknown canonicals instead of calling `ensure_canonical_grammar()`;
- rejects pending / placeholder guides;
- validates a supplied `guide_slug` against the resolved canonical guide;
- preserves the existing duplicate-safe sentence update behaviour;
- preserves transactional replacement of sentence→grammar links;
- allows one canonical to appear more than once in a sentence when the
  `surface` differs;
- prevents an exact duplicate `(sentence, canonical guide, surface)` annotation
  with a unique index.

This makes the database semantics match Phase 5/6 client behaviour rather than
relying on the Phase 5 placeholder-rejection trigger as the normal control path.

## Live verification performed

A rollback smoke test re-imported an existing sentence using the complete
canonical `〜てくる`.

The RPC:

- resolved the existing guide;
- reused the existing sentence identity;
- generated one canonical link;
- did not create a grammar guide.

The transaction was then rolled back. A follow-up query confirmed the original
saved sentence→grammar annotation was unchanged.

## Note

The Phase 5 `japanese_grammar_guides_reject_sentence_placeholder` trigger is
intentionally retained as defense in depth for any older or alternate code path
that might still try to create a sentence-discovered placeholder.
