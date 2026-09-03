# NINJAL grammar resources and examples

## What changed

- Added **NINJAL grammar resources & examples** to each numbered grammar workspace in Tobira Beginning II Lessons 11–20, and to repository grammar-reference pages (including standalone grammar URLs).
- Bundled an attributed snapshot of the official **日本語文型データベース 2026.01**: 800 patterns, 958 meanings, 1,988 formation groups and 9,552 examples.
- Displays original Japanese explanations, source furigana, formation rules, context/scene notes, usage restrictions and examples. Supplied grammar emphasis and strikethrough are preserved.
- Keeps the NINJAL reference separate from existing Hub/AI explanations, original examples and the private Dictionary of Japanese Grammar.
- Added a local grammar-heading search within each panel, an independent source-furigana switch and links to the original entries.
- Fetches the bundled JSON only when a resource panel is opened; subsequent panels share the loaded snapshot. No NINJAL API, scraping at runtime, iframe or external data request is needed.

## Where to use it

**Lesson route:** Lessons → open Lesson 12 → Grammar → open the たら grammar workspace → expand **NINJAL grammar resources & examples** → choose a **Meaning** → read the formation and examples. Three examples per formation are shown initially; use **Show more examples** for the rest.

**Repository route:** Open a sentence → click a grammar chip → expand the NINJAL panel. For 〜てくる, movement and change appear as separate entries, with meanings separately expandable. Nothing is silently linked to your sentence or saved grammar sense.

The panel search checks **pattern headings/readings only**, not words inside example sentences. Vocabulary integration, example capture/export and an additional SRS are not part of this change.

## Matching and limitations

- Exact pattern headings, normalised wave/width/spacing variants and explicit textbook aliases are supported. A bare heading such as そうだ displays its distinct source uses; it does not select one automatically.
- Textbook labels with English hints use explicit mappings. For example, Lesson 13's hearsay そうだ links only to the hearsay entry; resemblance and conjecture mappings are separate.
- Currently 50 of the 66 numbered textbook topics have heading references. The remaining 16 broad or absent topics keep their original lesson instructions and show a no-exact-match message with manual pattern search. Examples include noun-modifying clauses, the pronoun の and bare ば. The database is not a complete substitute for the textbook.
- Some mapped entries contain several senses beyond the lesson's use: read the category and explanation before choosing examples. Mappings identify useful reference headings, not verified sentence-to-sense equivalence.
- 〜てたら and 〜ていたら show たら only as an explicitly labelled **related reference**, not an exact equivalent.
- Manual partial searches require at least two characters and show at most 15 candidate headings. Refine a search to see more specific results.
- This is the pinned 2026.01 snapshot, not a live sync. English interface labels are added by the Hub, but no English translations or generated readings have been added to the source content.
- In-panel searches and furigana settings are temporary; they are not stored in Supabase or used to alter grammar links. Existing page URLs and browser history remain unchanged.

## Install

Apply this on top of the current Hub, including the earlier navigation and conversation-shadowing updates.

1. Extract the changed-files ZIP into the repository, preserving all folder paths.
2. Replace `app.js`, `repository.js`, `index.html` and the included lesson-flow test. Add `ninjal.js`, `ninjal.css`, `assets/ninjal-bunkei.json`, its attribution file, the converter, the new test and this guide.
3. Deploy using your usual GitHub/Netlify workflow, then hard-refresh the browser.
4. Check a lesson and a repository grammar page using the checklist below.

**No SQL migration, database changes, API keys, new production dependencies, private dictionary re-upload or audio re-upload are required.** The roughly 4 MB JSON is public, licensed reference data; your personal entries remain private. Include the `assets` files in deployment. No live deployment was performed here.

## Smoke-test checklist

- [ ] Lesson 12 → Grammar → たら: open the NINJAL panel, select a meaning and see formation-grouped Japanese examples with readings.
- [ ] Lesson 13 → hearsay そうだ: confirm the reference is 伝聞, not appearance/予想.
- [ ] Lesson 11 → pronoun の: confirm there is no false match to explanatory の; manual pattern search remains available.
- [ ] Repository sentence → 〜てくる: check separate movement/change entries and separate meanings. Existing sentence context, grammar explanation and private dictionary link remain present.
- [ ] Search `たら` and `てくる`; confirm a search does not navigate away or change the saved grammar link.
- [ ] Open **Show more examples**. Confirm examples stay under the relevant formation and sense.
- [ ] Toggle **Show source furigana**. Confirm the Japanese text and grammar emphasis remain; restore readings.
- [ ] Open **View original entry** and confirm it goes to the matching Bunkeibank headword in a new tab.
- [ ] Check the panel in both themes, on a narrow screen and at 200% zoom.
- [ ] Refresh a grammar URL and test browser Back/Forward. Confirm lesson and sentence navigation still work; in-panel searches need not survive navigation.
- [ ] If the JSON fails to load, confirm the panel offers Retry and the source link, while the rest of the lesson remains usable.
- [ ] Confirm no NINJAL panels appear in vocabulary or conversation-shadowing tasks, and existing task completion/notes are unchanged.

## Validation

Local checks cover dataset counts, source archive hash, all explicit aliases, ambiguous/missing patterns, escaped rendering, source readings and emphasis, lazy/shared loading, failed-load retry, heading search, source attribution and furigana control. Lesson-flow checks confirm one panel per grammar point and none on other tasks. Existing grammar, import, dictionary and navigation regression checks pass. Live browser rendering and deployed network behavior remain manual checks above.

To run the new checks:

```sh
node tests/ninjal.test.cjs
node tests/lesson-flow.test.cjs
```

The NINJAL interaction test uses the existing test-only Linkedom installation (or `LINKEDOM_MODULE` pointing to it); the site itself has no new dependency.

The deterministic converter accepts only the verified official ZIP:

```sh
python3 scripts/build-ninjal-data.py /path/to/nihongo_bunkei_database20260126.zip assets/ninjal-bunkei.json
```

The generated JSON is already supplied; ordinary deployment does not require running the converter. Review new source versions before updating the pinned hash, expected counts or mappings.

## Source and licence

Prashant Pardeshi and Yuriko Sunakawa, National Institute for Japanese Language and Linguistics, **日本語文型データベース（バージョン2026.01）**, [DOI 10.15084/0002000610](https://doi.org/10.15084/0002000610), [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). The [official file record](https://repository.ninjal.ac.jp/records/2000610/file_details/nihongo_bunkei_database20260126.zip?file_order=2&filename=nihongo_bunkei_database20260126.zip) identifies that licence. Adaptations and attribution are documented in `assets/ninjal-ATTRIBUTION.md` and displayed in each loaded panel.

## Suggested commit message

```text
feat(grammar): integrate NINJAL resources and example sentences
```
