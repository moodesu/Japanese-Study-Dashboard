-- Phase 3B — targeted canonical identity reconciliation
-- Safe follow-up to the Phase 3A audit.
--
-- Changes:
--   1. Complete the existing 〜わけではない placeholder in place, preserving
--      its guide ID, DOJG reference, and incoming related-grammar link.
--   2. Remove the obsolete standalone 〜てくれてありがとう guide after the
--      curriculum occurrence has been remapped to canonical 〜てくれる.
--   3. Remove the obsolete combined まだ／もう guide after Lesson 18 #3 is
--      remapped to the separate DOJG-backed まだ and もう canonical guides.
--
-- This migration aborts rather than deleting either obsolete guide if any
-- database dependency has appeared since the Phase 3A audit.
--
-- Rerunnable.

begin;

do $$
declare
  owner_id uuid;
  target_id uuid;
  target_summary text;
  separate_mada uuid;
  separate_mou uuid;
  dep_count integer;
begin
  select user_id into owner_id from private.app_owner;
  if owner_id is null then
    raise exception 'App owner not found.';
  end if;

  ---------------------------------------------------------------------------
  -- 1. Complete 〜わけではない in place from its linked DOJG metadata.
  ---------------------------------------------------------------------------

  select g.id into target_id
  from public.japanese_grammar_guides g
  where g.user_id=owner_id
    and g.pattern_key=public.repository_grammar_key('〜わけではない')
  limit 1;

  if target_id is null then
    raise exception 'Expected canonical guide 〜わけではない was not found.';
  end if;

  select d.summary into target_summary
  from public.grammar_dictionary_references r
  join public.japanese_dictionary_entries d
    on d.user_id=r.user_id
   and d.id=r.dictionary_entry_id
  where r.user_id=owner_id
    and r.grammar_id=target_id
  order by
    case r.source_volume
      when 'Basic' then 1
      when 'Intermediate' then 2
      when 'Advanced' then 3
      else 9
    end
  limit 1;

  if coalesce(trim(target_summary),'')='' then
    raise exception 'The linked DOJG summary for 〜わけではない is missing.';
  end if;

  update public.japanese_grammar_guides
  set
    meaning=case
      when meaning='Guide pending' or coalesce(trim(meaning),'')=''
        then target_summary
      else meaning
    end,
    summary=case
      when summary='Guide pending' or coalesce(trim(summary),'')=''
        then target_summary
      else summary
    end,
    guide_status='complete',
    is_placeholder=false,
    updated_at=now()
  where id=target_id
    and user_id=owner_id;

  ---------------------------------------------------------------------------
  -- 2. Remove standalone 〜てくれてありがとう only if still dependency-free.
  ---------------------------------------------------------------------------

  select g.id into target_id
  from public.japanese_grammar_guides g
  where g.user_id=owner_id
    and g.pattern_key=public.repository_grammar_key('〜てくれてありがとう')
  limit 1;

  if target_id is not null then
    select
      (select count(*) from public.japanese_repository_grammar x where x.grammar_id=target_id)
      +(select count(*) from public.japanese_grammar_variants x where x.grammar_id=target_id or x.related_grammar_id=target_id)
      +(select count(*) from public.japanese_grammar_clarifications x where x.grammar_id=target_id)
      +(select count(*) from public.japanese_grammar_related x where x.grammar_id=target_id or x.related_grammar_id=target_id)
      +(select count(*) from public.grammar_supplementary_links x where x.grammar_id=target_id)
      +(select count(*) from public.grammar_dictionary_references x where x.grammar_id=target_id)
    into dep_count;

    if dep_count<>0 then
      raise exception '〜てくれてありがとう now has % dependencies; refusing to delete it.',dep_count;
    end if;

    delete from public.japanese_grammar_guides
    where id=target_id and user_id=owner_id;
  end if;

  ---------------------------------------------------------------------------
  -- 3. Replace combined まだ／もう identity with separate canonical guides.
  ---------------------------------------------------------------------------

  select id into separate_mada
  from public.japanese_grammar_guides
  where user_id=owner_id
    and pattern_key=public.repository_grammar_key('まだ')
  limit 1;

  select id into separate_mou
  from public.japanese_grammar_guides
  where user_id=owner_id
    and pattern_key=public.repository_grammar_key('もう')
  limit 1;

  if separate_mada is null or separate_mou is null then
    raise exception 'Separate canonical guides まだ and もう must exist before removing まだ／もう.';
  end if;

  select g.id into target_id
  from public.japanese_grammar_guides g
  where g.user_id=owner_id
    and g.pattern_key=public.repository_grammar_key('まだ／もう')
  limit 1;

  if target_id is not null then
    select
      (select count(*) from public.japanese_repository_grammar x where x.grammar_id=target_id)
      +(select count(*) from public.japanese_grammar_variants x where x.grammar_id=target_id or x.related_grammar_id=target_id)
      +(select count(*) from public.japanese_grammar_clarifications x where x.grammar_id=target_id)
      +(select count(*) from public.japanese_grammar_related x where x.grammar_id=target_id or x.related_grammar_id=target_id)
      +(select count(*) from public.grammar_supplementary_links x where x.grammar_id=target_id)
      +(select count(*) from public.grammar_dictionary_references x where x.grammar_id=target_id)
    into dep_count;

    if dep_count<>0 then
      raise exception 'まだ／もう now has % dependencies; refusing to delete it.',dep_count;
    end if;

    delete from public.japanese_grammar_guides
    where id=target_id and user_id=owner_id;
  end if;
end $$;

commit;

-- Verification
select
  pattern,
  guide_status,
  is_placeholder,
  meaning
from public.japanese_grammar_guides
where user_id=(select user_id from private.app_owner)
  and pattern_key in (
    public.repository_grammar_key('〜わけではない'),
    public.repository_grammar_key('〜てくれる'),
    public.repository_grammar_key('〜てくれてありがとう'),
    public.repository_grammar_key('まだ'),
    public.repository_grammar_key('もう'),
    public.repository_grammar_key('まだ／もう')
  )
order by pattern;
