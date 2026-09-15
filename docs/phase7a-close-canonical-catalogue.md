# Phase 7A — Close canonical catalogue side effects

The live Grammar Library is now closed to implicit placeholder creation.

- `grammar_clarification` imports must attach to an existing complete canonical guide.
- `related_grammar` values inside full guide imports must already exist.
- `related_canonical` on variants/combined forms must already exist.
- A full `grammar_guide` import may still create a genuinely new complete guide because that is an explicit catalogue-maintenance action.
- New explicit guides are marked `discovered_from_sentence = false`.
- The legacy `ensure_canonical_grammar()` helper remains only for migration history and is no longer executable through API roles.

Live diagnostics after applying the migration:
- canonical guides: 653
- pending / placeholder guides: 0
- active functions referencing `ensure_canonical_grammar()`: 0

Next: remove obsolete pending-guide UI from the frontend.
