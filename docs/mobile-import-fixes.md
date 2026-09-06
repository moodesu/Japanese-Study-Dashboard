# Mobile import and Grammar Library fixes

## Changelog

- Persists Repository import JSON in `sessionStorage` under `learningHub.repositoryImportDraft` as the user types.
- Restores the draft whenever the import route remounts, including after tab/app suspension.
- Keeps the draft after preview errors, validation errors, stale previews, and failed imports.
- Clears the draft only after a successful import or an explicit Clear action.
- Adds a Clear button to the import form.
- Constrains Repository import, preview, Grammar Library grid/card, pending metadata, and nested flex/grid children to the available viewport width.
- Keeps JSON textarea horizontal scrolling local to the textarea.
- Allows long English match/metadata text to wrap without applying destructive global Japanese word breaking.
- Preserves horizontal ruby typography for grammar labels and contains exceptional long navigation labels locally.

## Smoke-test checklist

- At an iPhone-sized width, open Repository Import and paste a large JSON object.
- Confirm the textarea scrolls internally and the document has no horizontal scrollbar.
- Preview valid and invalid JSON; confirm preview content and buttons remain inside the viewport.
- Switch browser tabs/apps before and after Preview; confirm the JSON remains when returning.
- Navigate away from Import and return; confirm the draft is restored and can be previewed again.
- Trigger a validation or import failure; confirm the draft remains.
- Complete a successful import; reopen Import and confirm the draft is empty.
- Paste another draft and press Clear; confirm it is intentionally removed.
- Search Grammar Library using a long match and inspect pending metadata; confirm cards do not extend past the viewport.
- Confirm Japanese canonical labels and furigana remain horizontal and readable.

## Suggested commit message

`fix(repository): preserve import drafts and prevent mobile overflow`
