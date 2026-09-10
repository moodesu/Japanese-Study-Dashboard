# Phase 2B — DOJG reconciliation

Audit result: 629 DOJG entries.

## Audit breakdown
- 31 safe exact matches
- 10 same-headword rows across DOJG volumes
- 32 alias candidates
- 2 manual-review rows
- 554 entries with no existing canonical guide

## What this package does
The SQL creates `grammar_dictionary_references`, a many-to-many bridge between canonical Grammar Library guides and private DOJG entries.

It seeds **67 reviewed reference links** to existing canonical guides.

This deliberately supports more than one DOJG entry per canonical guide, so a guide such as `〜だけ`, `〜ほど`, `〜ことになる`, or `〜わけだ` can retain Basic/Intermediate/Advanced reference entries without duplicating the canonical card.

## Sense splits made now
- あげる (1) → `あげる`
- あげる (2) → `〜てあげる`
- もらう (1) → `もらう`
- もらう (2) → `〜てもらう`
- くれる (1) → `くれる`
- くれる (2) → `〜てくれる`
- 行く (1) → `行く`
- 行く (2) → `〜ていく`
- 来る (1) → `来る`
- 来る (2) → `〜てくる`
- 欲しい (1) → `欲しい`
- 欲しい (2) → `〜て欲しい`
- のに (1) → `〜のに`
- 間・あいだ(に) → both `〜間` and `〜間に`

## Review candidates promoted to their own canonical concepts for Phase 2C
- `お〜になる`
- `〜のに（目的）`
- `〜ながら（も）（逆接）`
- `〜も〜ば`
- `〜ば〜ほど`
- `〜が〜なら`
- `〜ても〜ても`
- `〜といい〜といい`
- `〜もVば〜もV`

## Not done yet
The 554 new DOJG entries are **not** inserted as grammar cards by this migration. Phase 2C will normalize their headwords into learner-facing canonical identities first, then create the missing cards and attach the exact DOJG references.

This prevents raw dictionary labels such as `(1)`, `(2)`, mixed kana/kanji labels, or compound comparison headings from becoming accidental duplicate canonical cards.
