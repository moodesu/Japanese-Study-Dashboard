# Phase 7B — Retire Pending Guides UI

Phase 7A closed all implicit canonical creation paths in Supabase. The Grammar
Library currently contains 653 complete guides and zero pending/placeholders.

Phase 7B removes the obsolete pending-guide user experience while preserving the
accepted Grammar Library visual system.

## Removed from the runtime UI

- Pending filter
- Pending-guide selection checkboxes
- Select-all action
- Batch guide-generation prompt action
- "View pending guides" action on a guide
- Single-guide generation prompt action
- Pending-guide callout panel

If a stale client/session still carries `grammarFilter = "pending"`, opening the
Grammar Library falls back to `all`.

## Intentionally deferred to Phase 8

The old pending-specific branches still exist inside `repository.js` for this
short transitional phase. They are unreachable in the supported UI and will be
deleted during the Phase 8 code simplification pass together with other legacy
placeholder assumptions.

This avoids mixing a UI retirement with the larger repository.js refactor.
