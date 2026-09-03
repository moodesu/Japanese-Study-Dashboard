# Dictionary furigana update

Adds optional furigana to the dictionary reader's headwords, formation tables and Japanese examples. Uses the existing Repository furigana preference. This is an update to the working private dictionary integration, not a replacement dictionary.

## Apply in this order

1. Back up your current app files. Extract **Japanese-Dictionary-furigana-changed-files.zip** into the repository, preserving the folder structure. Only changed/new feature files are included; keep unrelated local changes.
2. Extract **Japanese-Dictionary-furigana-sql.zip** separately. In your existing Supabase project's SQL Editor, run `migrations/20260903_dictionary_readings.sql`. The previous private-dictionary migration must already be applied. This creates an owner-only readings table; it does not change source entries, links, images or bucket permissions. It is safe to rerun.
3. Deploy the changed app files through your existing GitHub/Netlify process, then refresh the app. No new credentials, runtime packages or services are needed. Your existing `_headers` already makes `dictionary.js` revalidate.
4. Extract **Japanese-Dictionary-furigana-data.zip outside your repository and Netlify deployment directory**. It contains `private-dictionary-readings/dictionary-readings.json`. Do not commit or deploy this private data.
5. In the app, open **Repository → sentence → grammar → Open dictionary reference → Dictionary setup**.
6. Scroll to **Add dictionary furigana**. Choose `dictionary-readings.json` in the **Furigana data** file picker. Do not use the original dictionary-folder picker above it.
7. Confirm the preview says **629 entries ready**, then click **Upload furigana only**. Keep the page open until it finishes. Selecting the file alone does not upload anything.
8. Open a dictionary entry and switch **Furigana on**. The same preference is shared with the Repository sentence and grammar pages.

**No image re-upload is required.** The readings JSON is approximately 1.65 MB uncompressed; it updates only annotations. Existing dictionary IDs and saved references remain valid. Once uploaded, readings are available on your other signed-in devices; the on/off preference itself remains device-local, as before.

If upload is interrupted, select the same readings file and retry. Completed batches are safe to repeat. If the app reports missing dictionary entries, ensure the original dictionary setup completed in the same account first. This package targets the 629 entries from your supplied dictionary conversion; it does not guess matches to a different dictionary edition.

## What changes on the page

- Furigana appears above kanji in text-based headwords, formation examples and example sentences. Matching kana prefixes and verb/adjective endings remain outside the ruby where possible.
- Turning furigana off restores the original text. Grammar highlighting, tables, English translations and punctuation remain intact.
- The reader labels readings as **automatically generated and unverified**. Names and context-dependent readings can be wrong. This is an added reading aid, not publisher-supplied annotation.
- There are 33,263 generated annotation spans across the 629 entries. Seventy-one token occurrences were left plain because the generator had no reading or could not safely align the reading across the original formatting. These are not replaced with guesses.
- Scanned reference images remain unchanged. Their text cannot follow the furigana toggle.
- If the readings table or data is missing, the original dictionary still opens and explains how to add furigana. Invalid or mismatched annotations cannot replace source text.

## Changelog

- Added a separate `japanese_dictionary_readings` table with owner-scoped RLS and a foreign key to the owner's original dictionary entry.
- Added one-entry reading retrieval, text-offset validation and safe ruby rendering without changing stored source HTML.
- Connected the dictionary reader to the existing Repository furigana toggle and persisted preference.
- Added a preview/confirm **Upload furigana only** action, ownership preflight and retry-safe batches. It never writes to dictionary source entries, saved links or Storage images.
- Added an offline generator and a separate private readings package. No external translation service receives dictionary content, and no tokenizer is downloaded by app visitors.
- Extended automated tests for source preservation, shared toggle, annotations, upload/retry, fallback behavior and access control. Existing lesson and grammar/import tests continue to pass.

## Smoke-test checklist

- [ ] Apply the separate SQL successfully and deploy the changed app files.
- [ ] Before adding readings, open a dictionary entry: original content still works and setup guidance is visible.
- [ ] Choose the readings JSON: see 629 entries; verify upload requires the confirmation button.
- [ ] Finish the readings-only upload; verify that no images are re-uploaded.
- [ ] Open Basic `たら`. Formation examples should show readings for 話, 高, 静 and 先生; the example beginning 山田さんが来 should show やまだ and き.
- [ ] Toggle furigana off/on: the original Japanese, English, formatting and grammar highlights remain unchanged.
- [ ] Return to the Repository sentence/grammar page and confirm the same toggle preference is retained; reload and check it persists on this browser.
- [ ] Reopen a previously saved dictionary reference and confirm it still points to the same entry.
- [ ] Confirm reference images and image zoom still work and do not change with the toggle.
- [ ] Check another signed-in device can read the uploaded annotations.
- [ ] Re-test one enriched JSON import, its existing furigana and an Anki export.
- [ ] Confirm the private readings folder/data ZIP are absent from Git and Netlify deployment files.

## Validation and implementation notes

Local automated tests passed for all 629 reading overlays: every supplied annotation applies, removing ruby readings preserves the exact original text, and switching furigana off restores the sanitized original HTML. Tests also cover malformed/overlapping annotations, hostile reading strings, source mismatches, existing ruby, the shared persistent toggle, no-network toggle changes, missing-readings fallback, uploads/retries and unmatched-dictionary preflight. SQL tests cover reruns, overlay upserts, original text preservation, anonymous denial and cross-user isolation. Existing dictionary, lesson-flow and grammar/import tests passed.

These are local DOM/mocked-client and PostgreSQL-compatible PGlite checks, not live Netlify/Supabase browser tests. No production migration, upload or deployment was performed.

The data was generated locally using [Kuromoji's documented tokenizer and reading field](https://github.com/takuyaa/kuromoji.js), with `kuromoji@0.1.2` and `linkedom@0.18.12`. Japanese context is preserved across inline grammar-highlighting spans when tokenizing; annotations are applied only where the original text node and offsets match exactly. Readings contain kana and offsets, not executable HTML.

Optional regeneration, with the private inputs/output outside the repository:

```sh
npm install --prefix /tmp/jlh-dictionary-furigana --no-save kuromoji@0.1.2 linkedom@0.18.12
node scripts/prepare-dictionary-readings.cjs /private/dictionary-data.json /private/new-dictionary-readings.json
```

The generator refuses an existing output file. It does not access Supabase or modify the input. `KUROMOJI_MODULE` and `LINKEDOM_MODULE` support alternate local package paths.

Run the updated tests with their test-only dependencies installed as described at the top of each test file:

```sh
node --check dictionary.js
node tests/dictionary.test.cjs
node tests/dictionary-sql.test.cjs
node tests/repository-grammar.test.cjs
node tests/repository-grammar-import.test.cjs
node tests/lesson-flow.test.cjs
git diff --check
```

For the full private-data check, set `DICTIONARY_DATA_DIR` to the original extracted dictionary folder and `DICTIONARY_READINGS_FILE` to the new readings JSON when running `tests/dictionary.test.cjs`. Test dependencies are not part of the deployed app.

## Suggested commit messages

App:

```text
feat(dictionary): add optional furigana and readings-only import
```

Separate database change:

```text
db: add owner-scoped dictionary reading overlays
```

Do not include the private data in either commit. To roll back, restore the backed-up app files through your normal Git workflow. The new readings table can remain private and unused; deleting data is unnecessary. Original dictionary content and saved links are not changed by this update.
