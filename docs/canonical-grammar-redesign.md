# Canonical Grammar Library redesign

## Changelog

- Replaced sentence-derived grammar-guide identities with canonical grammar concepts.
- Sentence JSON now uses structured `grammar_points` annotations containing `canonical`, `surface`, and `note`.
- Added separate `grammar_guide` and `grammar_clarification` imports.
- Grammar-guide updates preserve clarifications previously added through separate follow-up imports.
- Added canonical guide records, searchable variants, sentence-to-guide links with surface evidence, reusable clarifications, and related-grammar links.
- Added minimal canonical placeholders when a sentence references a guide that has not been written yet.
- Added a Grammar Library page that shows canonical guides only.
- Grammar search now includes patterns, meanings, contractions, spoken forms, and combined forms while returning canonical guide cards; combined-form searches also expose their explicitly related canonical guide.
- Redesigned guide pages around Overview, Formation, Usage and nuance, Forms / variants, Combined forms, Clarifications, My examples, Reference examples, Related grammar, and References.
- Personal examples are read from sentence links and are not copied into guide content.
- Updated private DOJG reference identity to use the stable canonical guide slug.
- Replaced the Project instructions and example JSON with the canonical schema.

## Installation

1. Apply `migrations/20260906_canonical_grammar_redesign.sql` once in the Supabase SQL Editor.
2. Deploy the changed application files.
3. Replace the ChatGPT Project instructions with `Learning-Hub-Project-Instructions.md`.
4. Rebuild the Grammar Library using `grammar_guide` JSON, then import new sentence JSON using canonical annotations.

The migration deliberately deletes the old grammar guides, variants, clarifications, sentence/grammar links, and saved grammar-to-dictionary links. It clears the obsolete `grammar_points` metadata on existing sentences but preserves the sentences, corrections, revision history, exports, lessons, media, books, and other Learning Hub data.

Do not run this reset migration again after rebuilding grammar content.

## Smoke-test checklist

- [ ] Apply the SQL migration once and confirm existing Repository sentences still exist.
- [ ] Confirm old grammar cards and old sentence grammar chips are gone.
- [ ] Import `examples/canonical-grammar-guide-import.json` and confirm `〜たら` appears in Grammar Library.
- [ ] Search Grammar Library for `てたら`; confirm `〜たら` is returned with `Matched: 〜てたら` and related `〜ている` is discoverable.
- [ ] Confirm neither `〜てたら` nor `〜ていたら` appears as an independent card.
- [ ] Import `examples/repository-grammar-import.json`.
- [ ] Confirm the sentence links to `〜たら`, `〜ている`, and `〜てくる`.
- [ ] Confirm no guide named `〜てたら` or `見てたら` is created.
- [ ] Open `〜たら`; confirm the imported sentence appears under **My examples** with surface `見てたら`.
- [ ] Import a sentence containing `食べちゃった` linked to canonical `〜てしまう`; confirm no `〜ちゃった` guide is created.
- [ ] Import `何してる？` linked to canonical `〜ている`; confirm no `〜てる` guide is created.
- [ ] Import `examples/grammar-clarification-import.json`; confirm the contrast appears under `〜たら` and the original sentence is unchanged.
- [ ] Confirm reference examples are visually separate from My examples.
- [ ] Open a related-grammar link and use browser Back to return to the previous guide.
- [ ] Check Grammar Library and guide pages in light/dark themes and at mobile width.
- [ ] Confirm lessons, audio, shadowing, Repository search, dictionary, NINJAL, furigana, Migaku/Anki exports, and WaniKani still work.

## Suggested commit message

`feat(grammar): rebuild library around canonical concepts`
