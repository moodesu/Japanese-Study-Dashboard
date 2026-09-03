# Site-wide furigana update

## Changelog

- Replaced the Repository, dictionary and NINJAL-specific controls with one **Furigana on/off** switch in the site header.
- Made the setting persist across pages, browser navigation and reloads. Existing `repositoryShowFurigana` preferences are migrated automatically.
- Kept readings supplied by Repository JSON, private dictionary overlays and NINJAL as the authoritative readings.
- Added automatic readings for otherwise unannotated Japanese text throughout rendered site content, including Japanese embedded in English explanations.
- Added local Kuromoji 0.1.2 and IPADIC browser assets. They are loaded only when automatic readings are needed and do not send study text to a third-party service.
- Excluded form controls, editable content, code and preformatted text from automatic annotation.
- Updated cache headers and regression tests.

No SQL or database changes are required.

## Behaviour and limits

- Automatic readings are a display fallback and may be wrong for names or ambiguous words. Explicit `japanese_furigana` data is still preferred and remains necessary when an export needs furigana in its data.
- Turning furigana off hides readings without deleting them. Turning it on again does not require the page to be reopened.
- The first enablement can briefly show **Preparing…** while the local dictionary (about 18 MB compressed) loads. The browser can cache it for later visits.
- Text baked into scanned dictionary images cannot be annotated or hidden.
- The bundled engine and dictionary notices are in `vendor/kuromoji-licenses/`.

## Smoke-test checklist

- [ ] Open a lesson containing kanji and confirm readings appear with **Furigana on**.
- [ ] Open the Repository sentence `お弁当箱を見てたら、お腹すいてきた。` and confirm `見` and `腹` receive readings in both the saved sentence and its explanation.
- [ ] Turn furigana off and confirm readings disappear from the lesson, Repository, grammar page, NINJAL panel and dictionary reader.
- [ ] Navigate with in-app links and browser Back/Forward; confirm the switch state is retained.
- [ ] Reload the site and confirm the saved switch state is retained.
- [ ] Turn furigana back on and confirm dynamically rendered pages are annotated without another interaction.
- [ ] Confirm JSON-supplied readings and dictionary overlay readings are not duplicated or nested.
- [ ] Confirm textareas, inputs and code samples remain plain editable text.
- [ ] Confirm the control fits in the header in light/dark themes and on a narrow mobile viewport.
- [ ] Confirm scanned dictionary images remain unchanged.

## Suggested commit message

`feat(furigana): add one site-wide reading switch`
