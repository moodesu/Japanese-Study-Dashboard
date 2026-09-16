# Japanese Learning Hub

Private, single-user Japanese study dashboard using Netlify and Supabase.

## Current architecture

The main study flow is:

`Home → Study Plan → Book / Lesson → Guided Lesson`

The canonical grammar flow is:

`textbook occurrence / sentence annotation → existing canonical Grammar Library guide → references / supplementary practice`

Sentence imports must resolve against the existing complete canonical library. They do not create placeholder grammar guides. Surface forms remain sentence or variant data rather than separate canonical cards.

## Authoritative runtime

- `styles.css` — single authoritative application stylesheet
- `app.js` — Home, Plan, Hub, books, lessons and Guided Lesson
- `repository.js` — Japanese Repository and Grammar Library
- `repository-search-input.js` — search/IME handling and live canonical validation
- `dictionary.js`, `dojg-references.js`, `ninjal.js` — grammar references
- `supplementary.js` — optional grammar-practice resources
- `router.js` — routes
- `theme-init.js`, `site-furigana.js` — persistent UI state

Historical implementation notes remain under `docs/`, `migrations/`, and `audits/`.

## Database

The deployed Supabase project is the source of truth for the live database.

`supabase-schema.sql` is a foundational bootstrap file, not a complete current schema snapshot. The live database was evolved through the tracked migrations.

## Checks

```bash
node --check app.js
node --check repository.js
node --check repository-search-input.js
node --check router.js

for test in tests/*.test.cjs; do
  echo "==> $test"
  node "$test" || exit 1
done
```

Run locally with:

```bash
python3 -m http.server 4173
```

Production deploys from GitHub through Netlify; local changes do not affect the live app until committed and pushed.
