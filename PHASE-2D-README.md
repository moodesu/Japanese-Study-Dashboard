# Phase 2D — DOJG-backed canonical Grammar Library

## Final mapping

- DOJG source entries: **629**
- Canonical concepts represented by the reviewed mapping: **620**
- Source-to-canonical reference links in this migration: **630**
- Canonical concepts supported by more than one DOJG entry: **10**

All 22 Phase 2C collision rows have now been resolved.

Important resolutions include:

- Basic `する (1)` is **not** merged into the existing decision pattern `〜にする`.
  It becomes `〜くする／〜にする（変化）`.
- Basic and Intermediate `Relative Clause` both enrich the existing `名詞修飾節` guide.
- Basic and Intermediate quotation `と` share `〜と（引用・様態）`.
- Basic / Intermediate forms such as `も`, `も〜も`, `ものだ`, comparison `より`,
  `くらい`, `ことになる`, and `ほど` share one canonical guide and retain
  separate DOJG source references.
- Basic and Advanced `だけ` share the canonical `〜だけ` card while preserving
  both dictionary entries.
- `間・あいだ(に)` is deliberately linked to both `〜間` and `〜間に`.

## Why JLPT becomes nullable

DOJG Basic / Intermediate / Advanced volume is not an official JLPT mapping.
The earlier `NOT NULL` column forced Phase 1 to use a provisional N4 value.
For the expanded reference catalogue, `NULL` is preferable to invented metadata.

Existing JLPT values are unchanged.

## Preservation

The migration never overwrites an existing guide with DOJG text. Existing:

- Tobira/GID guide explanations
- personal sentence examples
- clarifications
- variants
- related grammar
- supplementary links

remain intact.

For a genuinely new DOJG-backed guide, the DOJG summary is used as the compact
overview and the complete private source remains in your Dictionary reader.

## After applying

Run the verification queries at the end of the migration. The important result
is that **629 distinct DOJG entries are linked**.

The next Phase 2 step is UI integration: canonical guide pages will list their
exact Basic / Intermediate / Advanced DOJG sources directly, so one click opens
the correct private dictionary entry rather than starting a manual search.
