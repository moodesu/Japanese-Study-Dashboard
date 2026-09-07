# Grammar layout and mobile utility-menu refinement

## Changelog

- Excluded desktop, bottom-navigation and mobile More-menu glyphs from automatic furigana generation.
- Replaced the unexplained account circle with a recognisable account/logout arrow and aligned all utility glyphs to one size.
- Added grammar meaning and optional JLPT/register metadata directly beneath the compact Grammar Guide heading.
- Moved sentence context immediately below the heading when the guide is opened from a saved sentence.
- Combined Overview, Formation and Usage/nuance into one article flow separated by quiet dividers rather than independent cards.
- Kept variants, combined forms, clarifications, personal examples, reference examples and related grammar in the requested reading order.
- Moved Dictionary, NINJAL, imported reference links and textbook connections to a final compact `References & further study` block.
- Preserved Dictionary opening, NINJAL lazy loading, canonical relationships, surface highlighting and browser routing.

## Smoke test checklist

### Mobile More menu

- Turn site furigana on, open More and confirm 文, 文法, 漢 and 振 have no readings above them.
- Confirm all eight tiles have consistent height, icon alignment and label baselines.
- Confirm the Pomodoro glyph keeps its warm colour and the account tile says Login or Logout appropriately.
- Exercise every More-menu destination and confirm the existing bottom navigation remains unchanged.

### Grammar Guide

- Open `〜終わる` directly from Grammar Library.
- Confirm the back control, grammar heading, meaning and Overview appear first without Dictionary or NINJAL blocking them.
- Confirm the guide flows through Formation, Usage/nuance, variants, clarifications, examples and Related grammar.
- Confirm `References & further study` is last and contains working Dictionary and NINJAL controls.
- Expand NINJAL and confirm its search/results still load inside the compact reference area.
- Open the Dictionary entry and return; confirm history and guide position behave normally.

### Sentence context

- Open a guide from a saved sentence.
- Confirm `In this sentence` remains near the top, highlights the exact stored surface without breaking ruby, and shows the stored link note.
- Toggle furigana and confirm study content changes while navigation glyphs remain plain.

## Suggested commit

`style(grammar): streamline guide layout and mobile utility menu`
