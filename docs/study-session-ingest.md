# Direct study-session ingestion (draft)

This is a **server-side, append-only** endpoint for adding verified Japanese study sentences without copying JSON through the browser. It does **not** let the client or the assistant administer the database.

## Endpoint

`POST /.netlify/functions/study-ingest`

Headers: `Authorization: Bearer <STUDY_INGEST_TOKEN>`, `Content-Type: application/json`

Example body:

```json
{
  "entries": [{
    "entry_type": "sentence",
    "status": "learning",
    "japanese": "コーヒーを買ってくる。",
    "japanese_furigana": "コーヒーを[買|か]ってくる。",
    "english": "I'll go buy some coffee.",
    "explanation": "〜てくる: go and perform an action, often expecting to return.",
    "tags": ["flying-witch", "grammar"],
    "notes": "Learner independently produced this example.",
    "register": "casual",
    "grammar_points": []
  }]
}
```

Returns per-entry `created` or `already_exists`. Existing Japanese sentences **are never updated**.

## Site configuration

Configure these in the Netlify site's secret **Functions** environment, NOT in Git, site JavaScript, or ChatGPT messages:

- `SUPABASE_URL`: your current Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase service-role secret; treat as admin-level
- `ALLOWED_USER_ID`: exact owner's authenticated Supabase UUID
- `STUDY_INGEST_TOKEN`: a randomly generated, independently revocable ingestion token (32+ random bytes)

Only deploy when the Supabase project is active. Rotate `STUDY_INGEST_TOKEN` if exposed. A serverless function still requires a caller authorized to send the token; enabling this endpoint does **not** by itself grant ChatGPT access to a Netlify function. Connect an approved API-capable integration with this endpoint if available, or arrange an authenticated intermediary. The GitHub connector edits code, not the live database.

## Limits

- Accepts 1–50 sentence entries per request and 128 KiB.
- Rejects unexpected fields, mismatched furigana, invalid statuses, and canonical grammar links.
- Exact Japanese duplicates are skipped. Concurrent requests can still race; a database unique index is needed for a strict guarantee.
- Existing grammar-guide linkage remains the responsibility of the normal Learning Hub importer. This endpoint stores grammar explanations as sentence context only.
- A sequence of writes is not atomic; retry after failure is safe for already-created sentences.
- If the project migrates to Hetzner/Postgres, replace the server-side database adapter, retain the API shape and scoped authorization.

## Review checklist

- Verify the target Netlify site's GitHub repository before deploy.
- Confirm the live `japanese_repository` schema supports these fields and the user's RLS policy.
- Confirm `SUPABASE_SERVICE_ROLE_KEY` only exists on the server.
- Test authentication: missing/wrong token -> 401, missing configuration -> 503.
- Test validation and duplicates; confirm no existing rows are modified.
- Consider a database-specific stored procedure with restricted permissions for production hardening.
