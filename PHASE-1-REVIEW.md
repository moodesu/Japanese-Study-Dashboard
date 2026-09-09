# Phase 1 — TOBIRA II + Grammar in Depth canonical catalogue

## Result

- **89 canonical reference concepts**
- **75 explicit TOBIRA II occurrence → canonical mappings**
- **71 GID Part 2 section → canonical links**
- Existing completed guides are not overwritten.
- Existing placeholders are filled with the Phase 1 seed.
- Missing canonical guides are inserted.
- Existing personal repository examples remain linked by guide ID.

## Important identity decisions

- Surface/contraction forms are not cards: e.g. `〜ちゃう` belongs under `〜てしまう`.
- Distinct same-spelling senses are named explicitly where needed, e.g.
  - `〜そうだ（伝聞）`
  - `〜そうだ（様態）`
- `の` is split where the grammatical identity is genuinely different:
  - `〜の（代名詞）`
  - `〜の（名詞化）`
- GID comparison chapters link to multiple canonical cards instead of becoming fake “comparison grammar” cards.
- GID conceptual sections such as protagonist viewpoint are references, not standalone canonical constructions.

## Lesson 11 example

TOBIRA II Lesson 11 Grammar 2 now maps explicitly:

```text
Lesson 11 · Grammar 2
noun modification clauses
        ↓
名詞修飾節
        ↓
Grammar in Depth · E3 · p.65
```

Once the SQL migration is applied, the existing lesson-side supplementary renderer can resolve that reference through the canonical guide instead of requiring a special Lesson 11 patch.

## Files

- `grammar-occurrences.js` — replacement production file with complete TOBIRA II mappings.
- `migrations/20260910_phase1_tobira2_canonical_catalogue.sql` — Phase 1 database seed/link migration.
- `Phase-1-Canonical-Catalogue.csv` — reviewable canonical catalogue.
- `Phase-1-Tobira-II-Occurrences.csv` — occurrence audit.
- `Phase-1-GID-Canonical-Links.csv` — GID mapping audit.

## Apply order

Do **not** run the SQL until the catalogue has been reviewed.

When approved:

1. Put `grammar-occurrences.js` into the repository root.
2. Put the SQL file in `migrations/`.
3. Run the SQL in Supabase after the existing GID migration.
4. Commit/push the repo file changes.
5. Test Lesson 11 Grammar 2, Lesson 15 Grammar 1/2, conditional sections, and Grammar Library cards.

Phase 2 will enrich this canonical backbone from DOJG rather than creating another parallel grammar database.
