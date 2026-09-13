Phase 4C FIXED

Root cause: the original bulk package stored japanese_furigana as an empty string for DOJG examples without reading markup. The database reference-example constraint rejects that shape.

Fix: those examples now store the plain Japanese sentence in japanese_furigana. This is a valid no-ruby representation because stripping ruby markup reproduces the Japanese sentence exactly.

Apply this ZIP over the previous package. The six migration filenames are unchanged and will overwrite the faulty copies. A failed BEGIN/COMMIT migration is rolled back, so rerun the corrected file from its beginning.
