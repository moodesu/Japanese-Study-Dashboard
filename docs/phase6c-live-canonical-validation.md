# Phase 6C — Live canonical validation

Sentence JSON preview now validates grammar annotations against the authenticated
user's live Grammar Library before Import can be enabled.

## Behaviour

- Existing canonical labels pass unchanged.
- A saved variant that belongs to exactly one guide is normalized for import.
  The user's sentence `surface` remains unchanged.
- A saved form that maps to multiple canonical guides is blocked as ambiguous.
  Example: `〜てたら` maps to both `〜たら` and `〜ている`, so JSON must contain
  both canonical annotations when both contribute.
- An unknown label is blocked and must be reconciled as catalogue maintenance.
- No sentence preview can create a pending grammar placeholder.
- Async resolver results are discarded if the JSON changes while validation is
  in flight.

## Verified live resolver examples

- `〜たら` → `〜たら` (canonical)
- `〜てる` → `〜ている` (contraction)
- `〜ちゃった` → `〜てしまう` (contraction)
- `〜てたら` → `〜たら` + `〜ている` (ambiguous combined form; block)
- `〜PHASE6-NOT-A-GRAMMAR` → no match

## Smoke test

1. Paste valid sentence JSON using an existing canonical. Preview should report
   that all labels match the live Grammar Library.
2. Put `〜ちゃった` in the JSON `canonical` field while keeping the observed
   sentence form in `surface`. Preview should show that it will normalize to
   `〜てしまう`, and Import should be enabled.
3. Put `〜てたら` in the `canonical` field. Preview should block Import and
   list `〜たら` and `〜ている`.
4. Put `〜PHASE6-NOT-A-GRAMMAR` in the `canonical` field. Preview should block
   Import with no saved match.
5. Confirm normal repository search still preserves caret position and Japanese
   IME composition.
