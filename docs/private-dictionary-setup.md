# Private Dictionary of Japanese Grammar integration

This update adds an optional private dictionary reference to Repository grammar pages. Existing JSON imports, AI grammar explanations, furigana, lessons, corrections and Anki exports remain unchanged. No live database migration, dictionary upload or deployment has been performed for you.

## Apply the update

1. Back up your current app files. Extract **Japanese-Dictionary-changed-files.zip** into the Japanese-Study-Dashboard repository, preserving its folder structure. This is an overlay for your current working version, not a complete replacement repository.
2. Extract **Japanese-Dictionary-sql.zip** separately. In the same Supabase project's SQL Editor, run `migrations/20260903_private_dictionary.sql`. This requires the previously applied repository and grammar-library migrations, including `repository_grammar_key`. The SQL is rerunnable and contains no dictionary content. It creates two private tables, a search function and a private Storage bucket with owner-scoped access policies. If a bucket with this name is already public, it stops for review rather than silently accepting it.
3. Commit/deploy the app changes through your existing GitHub/Netlify workflow. Include `_headers`, which allows images from your Supabase host and makes the two Repository scripts revalidate. No new runtime configuration or service-role key is needed.
4. Extract **Japanese-Dictionary-private-data.zip outside your repository and Netlify deployment directory**. Do not commit this ZIP or its extracted folder. The `.gitignore` entries are a safeguard, not a substitute for keeping private data out of deployment files.
5. On a desktop browser, sign into the Learning Hub. Open **Repository → a sentence → a grammar chip → Open dictionary reference**. Select the extracted `private-dictionary-data` folder when prompted.
6. Check the preview count: **629 entries and 628 images**. Choosing the folder does not upload anything. Click **Upload to my private dictionary** to start.
7. Keep the page open until setup finishes. The original PNG images total approximately 98 MB, plus approximately 2.5 MB of entry data; allow time for 628 individual uploads. Check your available Supabase storage allowance first. Setup verifies PNG signatures and content hashes before uploading. If interrupted, return to **Dictionary setup**, select the same folder and retry: existing image names are skipped and existing entry IDs are not duplicated or overwritten.

Setup is a one-time account upload; afterward, your other signed-in devices can read the dictionary without selecting the folder again. Mobile folder-selection support varies, so use desktop for setup.

## Use a reference

Open a sentence's grammar chip, then **Open dictionary reference**. The original explanation remains on the grammar page; the dictionary has its own reader and source label.

- Search by a headword or a shorter/base form. The app offers `たら` for `〜てたら` and `くる` for `〜てくる` as lookup shortcuts.
- Open a result and check that its meaning matches your sentence. Suggestions never save a link automatically.
- Click **Use this entry for …** to save it. Next time, the saved reference opens directly.
- **Search results** lets you choose another entry and replace the reference. **Remove saved reference** removes only that link, not the dictionary or AI explanation.
- For an imported grammar guide, the reference belongs to its normalized label and explicit `sense`, so sentences linked to that same meaning reuse it. Different senses remain separate. Built-in guides have their own identity. When no guide exists, the reference is limited to that sentence rather than guessed across sentences.

For the lunchbox sentence, look up `たら` for `〜てたら`. For `〜てくる`, compare the distinct `来る・くる` entries and choose the one describing a developing change, rather than movement toward the speaker.

The reader shows sanitized text, formation tables and examples, followed by the source's reference images. Images support Fit width, 150% and 200% with scrolling. **Refresh image links** obtains fresh five-minute links if an image fails or its link has expired. Image text/readings cannot follow the app's furigana toggle. Source cross-reference text is retained, but internal MDX hyperlinks are not interactive in this first version. This is a reader for the supplied MDX compilation, not an assertion that it is a publisher-certified digital edition.

## Where content is served

| Component | Location and access |
| --- | --- |
| UI and reader code | Your existing Netlify app; contains no dictionary entries or scans |
| Dictionary text and search metadata | `public.japanese_dictionary_entries`; Supabase RLS limits access to its owner |
| Saved grammar references | `public.japanese_dictionary_links`; owner-only and scoped by grammar meaning |
| PNG images | Private `japanese-grammar-dictionary` Storage bucket, under your account ID |
| Image delivery | Authenticated requests create five-minute signed URLs for the opened entry only |

Search returns at most 30 small result summaries. Opening a result fetches that entry and signs only its image paths. The app does not download the complete dictionary on each page visit. The ordinary signed-in Supabase client handles setup and reading; never add a service-role key to browser code.

Signed URLs are temporary bearer links: someone who receives one may use it until it expires. They are not public permanent image URLs. SQL tests include a pre-existing broad Storage policy to check that the new restrictive guard still blocks cross-user access to this bucket. Other buckets retain their existing policy behavior. Private access is a technical safeguard, not a determination of the supplied dictionary's licence; keep the content limited to your authorized use.

## Changelog

- Added an optional dictionary reader from Repository grammar pages, with search, volume labels, formation/example rendering and image zoom.
- Added explicit, persistent reference selection scoped to grammar meaning; no automatic ambiguous linking.
- Added account-based folder setup with content checks, progress and retry/resume behavior.
- Added allowlisted HTML rendering; original scripts, event handlers, external URLs and bundled styles are not executed or imported.
- Added separate owner-scoped SQL schema, private image bucket and access-control tests.
- Added an offline conversion script and separate private-data package. The source archive's `images.sh` helper is excluded and was not executed.
- Preserved existing lesson, import, furigana and export behavior. No changes to the translation Project JSON format are required.

## Smoke-test checklist

- [ ] Deploy the changed files and refresh the app; existing lessons and Repository browsing still work.
- [ ] Run the new SQL successfully; confirm the bucket is **private**.
- [ ] Before setup, open a grammar reference and see the setup prompt without losing the AI explanation.
- [ ] Select the private folder; see 629 entries / 628 images and verify that upload starts only on the explicit Upload click.
- [ ] Complete setup; search `たら` and `くる`, and open text, formation/examples and reference images.
- [ ] Save a matching reference; go back, reload, reopen and verify that the same entry is selected.
- [ ] Check another sentence with the same imported grammar label/sense reuses the reference; a different sense does not inherit it.
- [ ] Replace/remove a reference; confirm the underlying dictionary and grammar guide are unchanged.
- [ ] Use image zoom and Refresh image links; read the same reference on a second signed-in device.
- [ ] If setup is interrupted, retry the same folder and confirm it completes without duplicate entries.
- [ ] Sign out; verify that private dictionary content is no longer accessible through the app. Where a test second account exists, verify that it cannot read the first account's dictionary or images.
- [ ] Re-test enriched JSON import, sentence furigana toggle, existing grammar links and a one-card Anki export.
- [ ] Confirm the data ZIP and extracted private folder are absent from Git changes and Netlify deployment files.

Automated checks passed locally: DOM sanitization; manifest validation; all 629 supplied entries and all 628 PNG signatures/hashes; search/read/save/remove; session isolation; signed-image requests; upload/resume and corrupt-image rejection; SQL rerun, literal search, deduplication, append-only entries, owner-only links, anonymous/cross-user denial and public-bucket rejection. Existing lesson-flow, grammar rendering/import and grammar SQL tests also passed. These checks use a DOM harness, mocked Supabase client and local PostgreSQL-compatible PGlite; live Supabase Storage, Netlify deployment and browser usability remain the manual smoke tests above.

## Developer verification

No new runtime dependency is introduced. For the two new tests, install test-only packages outside the repository:

```sh
npm install --prefix /tmp/jlh-dictionary-test --no-save linkedom @electric-sql/pglite
node --check dictionary.js
node --check repository.js
node tests/dictionary.test.cjs
node tests/dictionary-sql.test.cjs
node tests/repository-grammar.test.cjs
node tests/repository-grammar-import.test.cjs
node tests/lesson-flow.test.cjs
PGLITE_MODULE=/tmp/jlh-dictionary-test/node_modules/@electric-sql/pglite node tests/repository-grammar-sql.test.cjs
git diff --check
```

`LINKEDOM_MODULE` and `PGLITE_MODULE` can point to alternative package installations. Set `DICTIONARY_DATA_DIR` to your extracted private folder when running `tests/dictionary.test.cjs` to validate the supplied manifest and image hashes as well.

The supplied data package is ready to use; regeneration is optional. `scripts/prepare-private-dictionary.py` accepts the original MDX/MDD ZIP and a new output directory outside the repository. It requires `readmdict` and its documented `python-lzo` dependency. It refuses an existing destination, resolves aliases, strips unsafe HTML, hashes PNG filenames and uploads nothing. Example:

```sh
python scripts/prepare-private-dictionary.py /path/to/dictionary.zip /private/location/private-dictionary-data
```

## Suggested commits and rollback

App commit: `feat(repository): add private Japanese grammar dictionary reader and references`

Separate database commit, if you track SQL in Git: `db: add private dictionary tables and storage policies`

Keep the data package out of both commits. To roll back the feature, restore the backed-up app files through your normal Git workflow. Leaving the new private tables/bucket in place preserves your imported content and saved references; deleting them is unnecessary for an app rollback. This update does not delete existing data.
