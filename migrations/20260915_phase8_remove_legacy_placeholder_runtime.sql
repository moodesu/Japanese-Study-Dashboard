-- Phase 8 — Remove legacy placeholder runtime
-- Mirrors the migration already applied directly to the connected project.

drop trigger if exists japanese_grammar_guides_reject_sentence_placeholder
  on public.japanese_grammar_guides;

drop function if exists public.reject_sentence_discovered_grammar_placeholder();

drop function if exists public.ensure_canonical_grammar(uuid,text,text);
