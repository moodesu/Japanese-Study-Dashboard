# Supplementary grammar practice

The Learning Hub exposes **マルチメディア日本語基本文法ワークブック
(Multimedia Exercises for Basic Japanese Grammar)** as an independent,
optional study resource. It is not a Programme and never changes lesson or
programme completion.

## Relationship model

The canonical Grammar Library remains the junction point:

`textbook occurrence → canonical grammar guide → supplementary workbook unit`

`grammar-occurrences.js` contains explicit, reviewed textbook-to-canonical
occurrences. It does not contain workbook IDs and does not use fuzzy matching.
`grammar_supplementary_links` joins the existing canonical guide ID to a
workbook unit. A future textbook therefore gains the same practice link by
mapping its occurrence to the existing canonical guide.

The first seed includes only exact and strong relations from the supplied live
Grammar Library cross-match. Related/component suggestions and the ambiguous
`〜そうだ` sense mapping are intentionally deferred.

## Private PDFs

The four copyrighted PDF parts remain in private Supabase Storage bucket
`textbook-pdfs`:

- `supplementary/multimedia-basic-grammar/part-01.pdf`
- `supplementary/multimedia-basic-grammar/part-02.pdf`
- `supplementary/multimedia-basic-grammar/part-03.pdf`
- `supplementary/multimedia-basic-grammar/part-04.pdf`

The database stores each unit's printed page, original physical PDF page,
resource part, and local split-PDF page explicitly. The browser requests a
short-lived signed URL on demand and opens the precise local page in a new tab.
Signed URLs are cached only in memory and are not persisted.

## Applying the feature

Run `migrations/20260908_supplementary_grammar_resources.sql` in Supabase after
the existing canonical Grammar Library and private-owner migrations. The
migration creates the four generic supplementary tables, RLS policies, one
resource, four PDF parts, 127 unit metadata rows, and the reviewed links to
canonical guides already owned by the app user.

No Storage upload is performed by the application. Upload the four PDFs to the
paths above separately if they are not already present.

## Smoke tests

- Open the Hub with Beginning II active, Intermediate I active, and no active
  programme; the workbook card remains available in every state.
- Browse all 127 units and check the Linked and Unlinked filters.
- Open Units 2, 28, 34, 62, 68, 97, and 99; verify local PDF pages 24, 1, 16,
  1, 14, 1, and 7 respectively in a new tab.
- Open canonical guides `〜ようになる`, `〜なら`, `〜はず`, `〜ていく`, and
  `〜てくる`; verify their Practice sections show Units 124, 62, 21, 47, and
  47.
- Open Beginning II Lesson 20 and Intermediate I Lesson 2; both
  `〜ようになる` occurrences should reuse Unit 124.
- Confirm practice buttons do not complete lesson tasks or alter programme
  percentages.
- Check the browser, grammar guide, and lesson buttons in narrow mobile and
  dark mode; the page must not overflow horizontally.

