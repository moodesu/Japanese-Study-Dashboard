-- Phase 5 — canonical sentence linking
-- Japanese Learning Hub
--
-- The canonical Grammar Library is now authoritative.
-- Sentence imports may link examples to existing canonical guides, but may no
-- longer create new pending/placeholder grammar identities as a side effect.
--
-- This migration intentionally does NOT rewrite
-- import_repository_with_canonical_grammar(). Existing canonical resolution,
-- duplicate-safe sentence updates and transactional link replacement remain
-- unchanged. Instead it adds a narrow database backstop: the legacy import RPC
-- may still attempt to create a placeholder when a canonical is missing, and
-- this trigger makes that transaction fail atomically rather than polluting
-- the canonical library.
--
-- Existing guide completion/import workflows remain available because this
-- only rejects NEW placeholder rows explicitly marked discovered_from_sentence.

begin;

create or replace function public.reject_sentence_discovered_grammar_placeholder()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if coalesce(new.discovered_from_sentence,false)
     and (
       coalesce(new.is_placeholder,false)
       or coalesce(new.guide_status,'pending')='pending'
     )
  then
    raise exception using
      errcode = '23514',
      message = format(
        'Sentence import references missing canonical grammar: %s. Add or reconcile the canonical guide explicitly before importing the sentence.',
        new.pattern
      );
  end if;

  return new;
end;
$$;

drop trigger if exists japanese_grammar_guides_reject_sentence_placeholder
  on public.japanese_grammar_guides;

create trigger japanese_grammar_guides_reject_sentence_placeholder
before insert on public.japanese_grammar_guides
for each row
execute function public.reject_sentence_discovered_grammar_placeholder();

comment on function public.reject_sentence_discovered_grammar_placeholder() is
  'Phase 5 backstop: sentence imports may link existing canonical grammar but may not create sentence-discovered placeholder guide identities.';

commit;

-- Verification 1: Phase 4 should have left no sentence-discovered placeholders
-- carrying live repository links. Expected: ZERO ROWS.
select
  g.id,
  g.pattern,
  g.guide_status,
  g.is_placeholder,
  g.discovered_from_sentence,
  count(l.repository_id) as linked_sentences
from public.japanese_grammar_guides g
left join public.japanese_repository_grammar l
  on l.grammar_id=g.id
 and l.user_id=g.user_id
where g.user_id=(select user_id from private.app_owner)
  and g.discovered_from_sentence
  and (g.is_placeholder or g.guide_status='pending')
group by
  g.id,g.pattern,g.guide_status,g.is_placeholder,g.discovered_from_sentence
order by g.pattern;

-- Verification 2: repository grammar links must all resolve to owned guides.
-- Expected: ZERO ROWS.
select
  l.repository_id,
  l.grammar_id
from public.japanese_repository_grammar l
left join public.japanese_grammar_guides g
  on g.id=l.grammar_id
 and g.user_id=l.user_id
where l.user_id=(select user_id from private.app_owner)
  and g.id is null;
