# Grammar surface context

## Changelog

- Renamed the saved-sentence grammar context to **In this sentence**.
- Highlights the exact stored sentence-link `surface` without deriving it from the canonical pattern.
- Shows a compact `surface → canonical grammar` mapping and the link-specific note.
- Preserves bracket-notation ruby markup and the existing site-wide furigana toggle.
- Highlights each stored surface independently in **My examples** on directly opened Grammar Library guides.
- Keeps context restricted to the canonical guide currently being viewed when one surface links to multiple guides.

## Smoke-test checklist

- [ ] Open `〜てくる` from a sentence linked with surface `行ってきた` and confirm only `行ってきた` is highlighted.
- [ ] Confirm `行ってきた → 〜てくる` and its stored note appear immediately below the sentence.
- [ ] Open `〜たら` and `〜ている` from a sentence where both links use `見てたら`; confirm both pages highlight `見てたら` but show only their own mapping and note.
- [ ] Toggle furigana on and off and confirm readings neither disappear incorrectly nor duplicate.
- [ ] Open a guide directly from Grammar Library and confirm there is no **In this sentence** section.
- [ ] Confirm each **My examples** sentence highlights its own stored surface.
- [ ] Check light/dark mode and mobile width.

## Suggested commit message

`feat(grammar): highlight linked surfaces in sentence context`
