# Duplicate-safe canonical sentence imports

## Changelog

- Exact `japanese` matches are resolved within the signed-in user's ordinary sentence entries.
- Matching imports retain the sentence ID, update only fields represented by the incoming JSON, and preserve unrelated stored metadata.
- Existing canonical sentence links are replaced transactionally by the incoming `grammar_points` links.
- Repeated identical imports leave one sentence and one copy of each incoming link.
- Preview distinguishes existing sentences that will be updated from new sentences that will be added.
- Added a partial unique index on `(user_id, japanese)` for `entry_type = 'sentence'` only.
- Correction entries remain exempt and may share the same final Japanese.

## Installation

Apply `migrations/20260906_duplicate_safe_sentence_import.sql` after the canonical grammar redesign migration, then deploy the changed application file.

The migration intentionally does not merge or delete existing duplicates. If its preflight reports duplicate ordinary sentences, manually delete the unwanted test rows and rerun it.

## Smoke-test checklist

- [ ] Delete unwanted existing duplicate test sentences.
- [ ] Apply the duplicate-safe SQL migration successfully.
- [ ] Import a new canonical sentence JSON and confirm Preview says it will be added.
- [ ] Import the identical JSON again and confirm Preview says the existing sentence will be updated.
- [ ] Confirm the sentence ID remains unchanged and only one sentence card exists.
- [ ] Confirm the canonical grammar link count matches the incoming JSON with no duplicates.
- [ ] Reimport with a changed grammar link set and confirm the old links are replaced.
- [ ] Confirm imported fields such as English, explanation and tags update.
- [ ] Confirm unrelated values such as status, lesson link and Migaku marker remain unchanged when absent from JSON.
- [ ] Create two correction entries with the same final Japanese and confirm both are allowed.

## Suggested commit message

`fix(repository): make canonical sentence imports idempotent`
