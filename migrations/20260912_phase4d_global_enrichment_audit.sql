-- Phase 4D — Global post-enrichment verification (READ ONLY)
-- Run after every Phase 4C bulk migration.
-- The FIRST result should report incomplete_guides = 0.
-- The FINAL result should return zero rows.

-- 1. Global completeness summary.
with guides as (
  select *
  from public.japanese_grammar_guides
  where user_id=(select user_id from private.app_owner)
),
scored as (
  select
    *,
    (case when coalesce(trim(meaning),'')<>'' and meaning<>'Guide pending' then 1 else 0 end
     + case when coalesce(trim(summary),'')<>'' and summary<>'Guide pending' then 1 else 0 end
     + case when coalesce(array_length(formation,1),0)>0 then 1 else 0 end
     + case when coalesce(array_length(usage,1),0)>0 then 1 else 0 end
     + case when coalesce(array_length(nuance,1),0)>0 then 1 else 0 end
     + case when jsonb_typeof(coalesce(reference_examples,'[]'::jsonb))='array'
             and jsonb_array_length(coalesce(reference_examples,'[]'::jsonb))>0
            then 1 else 0 end) as content_score
  from guides
)
select
  count(*) as total_guides,
  count(*) filter (where content_score=6) as fully_enriched,
  count(*) filter (where content_score<6) as incomplete_guides,
  min(content_score) as minimum_content_score,
  round(avg(content_score),2) as average_content_score
from scored;

-- 2. Source/reference integrity.
select
  (select count(distinct dictionary_entry_id)
   from public.grammar_dictionary_references
   where user_id=(select user_id from private.app_owner)) as dojg_entries_linked,
  (select count(*)
   from public.grammar_dictionary_references
   where user_id=(select user_id from private.app_owner)) as dojg_reference_links,
  (select count(distinct grammar_id)
   from public.grammar_dictionary_references
   where user_id=(select user_id from private.app_owner)) as guides_with_dojg,
  (select count(*)
   from public.grammar_supplementary_links
   where user_id=(select user_id from private.app_owner)) as supplementary_reference_links;

-- 3. FINAL issue list. Expected: ZERO ROWS.
with guides as (
  select *
  from public.japanese_grammar_guides
  where user_id=(select user_id from private.app_owner)
),
issues as (
  select
    'incomplete_guide'::text as issue_type,
    g.pattern as subject,
    concat(
      'formation=',coalesce(array_length(g.formation,1),0),
      ', usage=',coalesce(array_length(g.usage,1),0),
      ', nuance=',coalesce(array_length(g.nuance,1),0),
      ', examples=',case
        when jsonb_typeof(coalesce(g.reference_examples,'[]'::jsonb))='array'
        then jsonb_array_length(coalesce(g.reference_examples,'[]'::jsonb))
        else 0 end
    ) as detail
  from guides g
  where coalesce(trim(g.meaning),'')=''
     or g.meaning='Guide pending'
     or coalesce(trim(g.summary),'')=''
     or g.summary='Guide pending'
     or coalesce(array_length(g.formation,1),0)=0
     or coalesce(array_length(g.usage,1),0)=0
     or coalesce(array_length(g.nuance,1),0)=0
     or jsonb_typeof(coalesce(g.reference_examples,'[]'::jsonb))<>'array'
     or jsonb_array_length(coalesce(g.reference_examples,'[]'::jsonb))=0

  union all

  select
    'dojg_orphan',
    r.grammar_id::text,
    count(*)::text
  from public.grammar_dictionary_references r
  left join guides g on g.id=r.grammar_id
  where r.user_id=(select user_id from private.app_owner)
    and g.id is null
  group by r.grammar_id

  union all

  select
    'supplementary_orphan',
    l.grammar_id::text,
    count(*)::text
  from public.grammar_supplementary_links l
  left join guides g on g.id=l.grammar_id
  where l.user_id=(select user_id from private.app_owner)
    and g.id is null
  group by l.grammar_id

  union all

  select
    'repository_orphan',
    x.grammar_id::text,
    count(*)::text
  from public.japanese_repository_grammar x
  left join guides g on g.id=x.grammar_id
  where x.user_id=(select user_id from private.app_owner)
    and g.id is null
  group by x.grammar_id

  union all

  select
    'placeholder_with_dependencies',
    g.pattern,
    'guide still pending/placeholder'
  from guides g
  where (g.guide_status='pending' or g.is_placeholder)
    and (
      exists(select 1 from public.grammar_dictionary_references x where x.grammar_id=g.id)
      or exists(select 1 from public.grammar_supplementary_links x where x.grammar_id=g.id)
      or exists(select 1 from public.japanese_repository_grammar x where x.grammar_id=g.id)
    )
)
select *
from issues
order by issue_type,subject;
