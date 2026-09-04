# Reusable grammar clarifications

## Changelog

- Added optional `clarifications` to imported grammar-guide content.
- Added strict validation for clarification objects and their contrast examples, including `[漢字|かんじ]` equality checks and rejection of unknown fields.
- Added a clarification-only JSON import using `entry_type: "grammar_clarification"`.
- Clarification imports require the saved guide's core content to remain identical and never create, update or relink sentence entries.
- Exact existing clarifications are skipped. A reused normalized title with different content is rejected for review rather than overwritten.
- Added an append-only database function. Existing guide meaning, formation, explanation and examples remain immutable through the app.
- Added expandable **Clarifications & Contrasts** sections with paired cards on saved grammar-guide pages. Cards collapse to one column on narrow screens.
- Updated the Project instructions without changing the ordinary sentence/correction JSON contract.
- Added a ready-to-test clarification payload for `お弁当箱を見てたら、お腹すいてきた。`.

## Installation

1. Apply `migrations/20260904_grammar_clarifications.sql` in the Supabase SQL Editor after the existing grammar-library migration.
2. Deploy the changed application files.
3. Replace the Project's instructions with the updated `Learning-Hub-Project-Instructions.md`.

The SQL migration is supplied separately from the application files. It preserves existing sentences, links and grammar guides.

## Study-chat workflow

1. Ask a follow-up grammar question normally. This does not create JSON or a sentence automatically.
2. When the explanation is worth keeping, ask for the Learning Hub grammar clarification JSON.
3. The Project returns `entry_type: "grammar_clarification"` with the complete unchanged guide core and its clarification blocks.
4. In **Repository → Import JSON**, paste and preview it.
5. Confirm that the preview says **no sentence changes**, then select **Save clarifications**.
6. Reopen the linked grammar guide and expand **Clarifications & Contrasts**.

If the Project conversation does not contain the saved guide's exact core content, provide that guide rather than allowing the Project to reconstruct it. This prevents a follow-up discussion from silently rewriting the reusable explanation.

## Smoke-test checklist

- [ ] Apply the SQL migration twice and confirm both runs complete safely.
- [ ] Open an existing sentence and confirm its Japanese, explanation and grammar links are unchanged.
- [ ] Import a normal legacy sentence without `clarifications`; confirm it behaves as before.
- [ ] Import a new sentence guide containing `clarifications`; confirm the guide is created and linked normally.
- [ ] Paste `examples/grammar-clarification-import.json`; confirm the preview reports two new clarifications and no sentence changes.
- [ ] Save it and confirm the Repository sentence count and original sentence are unchanged.
- [ ] Open the `〜てたら` guide and confirm both clarification panels appear.
- [ ] Expand `見た vs 見ていた`; confirm the two contrast cards and furigana display correctly.
- [ ] Expand `見たら vs 見ていたら vs 見てたら`; confirm all three forms are clearly separated.
- [ ] Import the identical update again; confirm existing clarifications are skipped and Save remains disabled.
- [ ] Change the content but retain an existing clarification title; confirm the importer rejects it instead of overwriting the saved version.
- [ ] Break a contrast's furigana equality; confirm preview rejects the JSON.
- [ ] Change a core guide field in a clarification update; confirm preview rejects it.
- [ ] Check paired cards in light/dark themes and at mobile width.

## Suggested commit message

`feat(grammar): save reusable clarification contrasts`
