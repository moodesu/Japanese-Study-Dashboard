# Phase 9 — Final grammar subsystem sign-off

The canonical grammar / Japanese Repository subsystem has completed its planned
architecture work.

## Live database result

Final read-only audit:

- Canonical guides: **653**
- Pending / placeholder guides: **0**
- DOJG entries: **629**
- DOJG reference links: **633**
- Supplementary links: **110**
- Personal sentence→grammar links: **12**
- Grammar clarifications: **2**
- Final integrity issues: **0**

The duplicate-sentence-link rule is correctly evaluated at:

`repository_id + grammar_id + surface`

so multiple different surfaces may legitimately link to the same canonical guide
inside one sentence.

## Resolver smoke test

Authenticated resolver behaviour was verified in a rollback-only session:

- `〜たら` → exact canonical `〜たら`
- `〜てる` → `〜ている`
- `〜ちゃった` → `〜てしまう`
- `〜てたら` → both `〜たら` and `〜ている`
- deliberately unknown label → no result

The two-result `〜てたら` case is intentional. It is a combined form and must be
represented by its contributing canonical annotations rather than guessed down
to one guide.

## Clarification smoke test

A temporary clarification was appended to existing complete guide `〜たら`
inside a transaction. It resolved the existing guide correctly and produced the
expected clarification record. The transaction was rolled back.

A follow-up query confirmed **0** temporary smoke-test rows remained.

## Git history checked

The current main branch contains the final staged changes through:

- Phase 5 canonical-library-first sentence import
- Phase 6 canonical resolver / live validation / strict sentence import
- Phase 7 closed catalogue side effects / retired pending UI
- Phase 8 legacy placeholder runtime removal

## Architecture now

```text
Translation / capture
        ↓
live canonical resolver
        ↓
existing complete Grammar Library
        ↓
sentence → canonical links
        ↓
clarifications / personal examples / references
```

A new canonical guide can only enter through an explicit `grammar_guide` import.
Sentence capture, clarification capture, variants, and related-grammar links
cannot silently create catalogue identities.

## Status

**Grammar / Repository canonical architecture: COMPLETE.**

Future work should be product work, content work, or isolated maintenance rather
than additional architecture phases unless a concrete defect is discovered.
