# Phase 6A — Canonical resolution

Phase 6 starts by making canonical identity resolution explicit and reusable.

## Changes

- Adds `resolve_canonical_grammar_label(text)` as an owner-scoped read-only RPC.
- Resolution is exact only: canonical pattern first, then saved variant forms.
- The RPC never performs fuzzy guessing and may return multiple rows when a visible form is legitimately ambiguous.
- Sentence-import preview now checks saved variants when an incoming `canonical` label is not itself a canonical guide.
- When a saved variant has exactly one canonical owner, Preview tells the user which canonical should be used while leaving the sentence `surface` unchanged.
- Ambiguous forms are reported rather than auto-resolved.
- Learning Hub project instructions now reflect Phase 5/6: missing canonicals are catalogue-reconciliation problems, not placeholder creation events.

## Smoke test

1. `select * from public.resolve_canonical_grammar_label('〜たら');`
   should return the canonical `〜たら` row.
2. Resolve a known saved variant such as `〜てたら`; it should return its saved canonical mapping(s).
3. Resolve a nonsense label; it should return zero rows.
4. Paste sentence JSON whose `canonical` incorrectly contains a known variant. Preview should block import and suggest the saved canonical identity.
5. Paste JSON with a valid canonical and confirm normal import still works.
