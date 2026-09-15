-- Phase 7A — Close canonical catalogue side effects
-- Mirrors the migration already applied directly to the connected project.
--
-- The catalogue is now closed to implicit placeholder creation.
-- Explicit grammar_guide import may still create a NEW COMPLETE guide.
-- Clarifications, related grammar, and variant related_canonical must resolve
-- to existing complete canonical guides.

create or replace function public.append_canonical_grammar_clarification(p_clarification jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid:=auth.uid();
  guide public.japanese_grammar_guides;
  existing public.japanese_grammar_clarifications;
  saved public.japanese_grammar_clarifications;
  canonical_key text;
  requested_slug text;
begin
  if caller is null then raise exception 'Sign in before importing.'; end if;
  if jsonb_typeof(p_clarification) is distinct from 'object'
     or not(p_clarification ?& array['canonical','guide_slug','title','question','explanation','contrasts','sort_order'])
  then raise exception 'Invalid grammar clarification.'; end if;
  if not public.repository_contrasts_valid(p_clarification->'contrasts') then
    raise exception 'Invalid grammar clarification contrasts or furigana.';
  end if;

  canonical_key=public.repository_grammar_key(p_clarification->>'canonical');
  requested_slug=coalesce(p_clarification->>'guide_slug','');
  if coalesce(canonical_key,'')='' then raise exception 'Canonical grammar is required.'; end if;

  select * into guide
  from public.japanese_grammar_guides
  where user_id=caller and pattern_key=canonical_key;

  if guide.id is null then
    raise exception 'Clarification references missing canonical grammar: %. Add the canonical guide explicitly first.',p_clarification->>'canonical';
  end if;
  if requested_slug<>'' and guide.slug<>requested_slug then
    raise exception 'Grammar guide slug mismatch for %: expected %, received %.',guide.pattern,guide.slug,requested_slug;
  end if;
  if guide.guide_status<>'complete' or guide.is_placeholder then
    raise exception 'Clarification references incomplete canonical grammar: %. Complete the guide first.',guide.pattern;
  end if;

  select * into existing
  from public.japanese_grammar_clarifications
  where grammar_id=guide.id
    and title_key=lower(regexp_replace(trim(normalize(p_clarification->>'title',NFKC)),'[[:space:]]+','','g'));

  if found then
    if existing.question<>p_clarification->>'question'
       or existing.explanation<>p_clarification->>'explanation'
       or existing.contrasts<>p_clarification->'contrasts'
    then raise exception 'A clarification with this title already exists with different content.'; end if;
    return jsonb_build_object('guide',to_jsonb(guide),'clarification',to_jsonb(existing),'duplicate',true);
  end if;

  insert into public.japanese_grammar_clarifications(user_id,grammar_id,title,question,explanation,contrasts,sort_order)
  values(caller,guide.id,p_clarification->>'title',p_clarification->>'question',p_clarification->>'explanation',p_clarification->'contrasts',coalesce((p_clarification->>'sort_order')::integer,0))
  returning * into saved;

  return jsonb_build_object('guide',to_jsonb(guide),'clarification',to_jsonb(saved),'duplicate',false);
end;
$$;

create or replace function public.upsert_canonical_grammar_guide(p_guide jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid:=auth.uid();
  guide public.japanese_grammar_guides;
  related public.japanese_grammar_guides;
  item jsonb;
  clarification jsonb;
  chosen_slug text;
  canonical_key text;
  related_key text;
begin
  if caller is null then raise exception 'Sign in before importing.'; end if;
  if jsonb_typeof(p_guide) is distinct from 'object'
     or not(p_guide ?& array['canonical','meaning','summary','formation','usage','nuance','register','jlpt_level','variants','clarifications','related_grammar','reference_examples','references'])
  then raise exception 'Invalid grammar guide.'; end if;
  if not public.repository_reference_examples_valid(p_guide->'reference_examples') then
    raise exception 'Invalid grammar reference examples or furigana.';
  end if;

  canonical_key=public.repository_grammar_key(p_guide->>'canonical');
  if coalesce(canonical_key,'')='' then raise exception 'Canonical grammar is required.'; end if;

  chosen_slug=coalesce(nullif(p_guide->>'slug',''),'grammar-'||substr(md5(canonical_key),1,20));
  if chosen_slug!~'^[a-z0-9]+(-[a-z0-9]+)*$' then raise exception 'Invalid grammar slug.'; end if;

  perform pg_advisory_xact_lock(hashtextextended(caller::text,0));

  select * into guide
  from public.japanese_grammar_guides
  where user_id=caller and pattern_key=canonical_key
  for update;

  if exists(
    select 1 from public.japanese_grammar_guides candidate
    where candidate.user_id=caller and candidate.slug=chosen_slug
      and (guide.id is null or candidate.id<>guide.id)
  ) then
    raise exception 'Grammar slug % belongs to a different canonical guide.',chosen_slug;
  end if;

  if guide.id is null then
    insert into public.japanese_grammar_guides(
      user_id,slug,pattern,meaning,summary,formation,usage,nuance,register,jlpt_level,
      reference_examples,reference_links,is_placeholder,discovered_from_sentence,discovery_origins
    )
    values(
      caller,chosen_slug,p_guide->>'canonical',p_guide->>'meaning',p_guide->>'summary',
      array(select jsonb_array_elements_text(p_guide->'formation')),
      array(select jsonb_array_elements_text(p_guide->'usage')),
      array(select jsonb_array_elements_text(p_guide->'nuance')),
      p_guide->>'register',nullif(p_guide->>'jlpt_level',''),
      p_guide->'reference_examples',p_guide->'references',false,false,
      array['explicit_guide_import']::text[]
    )
    returning * into guide;
  else
    update public.japanese_grammar_guides
    set
      slug=chosen_slug, pattern=p_guide->>'canonical',
      meaning=p_guide->>'meaning', summary=p_guide->>'summary',
      formation=array(select jsonb_array_elements_text(p_guide->'formation')),
      usage=array(select jsonb_array_elements_text(p_guide->'usage')),
      nuance=array(select jsonb_array_elements_text(p_guide->'nuance')),
      register=p_guide->>'register', jlpt_level=nullif(p_guide->>'jlpt_level',''),
      reference_examples=p_guide->'reference_examples',
      reference_links=p_guide->'references',
      is_placeholder=false, updated_at=now()
    where id=guide.id
    returning * into guide;
  end if;

  if guide.pattern_key<>canonical_key then
    raise exception 'Grammar guide import mismatch: expected %, database updated %.',p_guide->>'canonical',guide.pattern;
  end if;

  delete from public.japanese_grammar_variants where grammar_id=guide.id;
  delete from public.japanese_grammar_related where grammar_id=guide.id;

  for item in select value from jsonb_array_elements(p_guide->'variants') loop
    related=null;
    if coalesce(item->>'related_canonical','')<>'' then
      related_key=public.repository_grammar_key(item->>'related_canonical');
      select * into related
      from public.japanese_grammar_guides
      where user_id=caller and pattern_key=related_key;

      if related.id is null then
        raise exception 'Variant % references missing canonical grammar: %.',item->>'form',item->>'related_canonical';
      end if;
      if related.guide_status<>'complete' or related.is_placeholder then
        raise exception 'Variant % references incomplete canonical grammar: %.',item->>'form',related.pattern;
      end if;
    end if;

    insert into public.japanese_grammar_variants(user_id,grammar_id,form,variant_type,explanation,related_grammar_id)
    values(caller,guide.id,item->>'form',item->>'variant_type',item->>'explanation',related.id);
  end loop;

  for clarification in select value from jsonb_array_elements(p_guide->'clarifications') loop
    if not public.repository_contrasts_valid(clarification->'contrasts') then
      raise exception 'Invalid grammar clarification contrasts or furigana.';
    end if;

    insert into public.japanese_grammar_clarifications(user_id,grammar_id,title,question,explanation,contrasts,sort_order)
    values(caller,guide.id,clarification->>'title',clarification->>'question',
           clarification->>'explanation',clarification->'contrasts',
           coalesce((clarification->>'sort_order')::integer,0))
    on conflict(grammar_id,title_key) do update
    set title=excluded.title,question=excluded.question,explanation=excluded.explanation,
        contrasts=excluded.contrasts,sort_order=excluded.sort_order,updated_at=now();
  end loop;

  for item in select value from jsonb_array_elements(p_guide->'related_grammar') loop
    related_key=public.repository_grammar_key(item#>>'{}');
    select * into related
    from public.japanese_grammar_guides
    where user_id=caller and pattern_key=related_key;

    if related.id is null then
      raise exception 'Grammar guide % references missing related canonical grammar: %.',guide.pattern,item#>>'{}';
    end if;
    if related.guide_status<>'complete' or related.is_placeholder then
      raise exception 'Grammar guide % references incomplete related canonical grammar: %.',guide.pattern,related.pattern;
    end if;

    if related.id<>guide.id then
      insert into public.japanese_grammar_related(user_id,grammar_id,related_grammar_id)
      values(caller,guide.id,related.id)
      on conflict do nothing;
    end if;
  end loop;

  return jsonb_build_object(
    'incoming_canonical',p_guide->>'canonical',
    'incoming_slug',coalesce(p_guide->>'slug',''),
    'guide',to_jsonb(guide)
  );
end;
$$;

revoke all on function public.ensure_canonical_grammar(uuid,text,text)
  from public, anon, authenticated;

comment on function public.ensure_canonical_grammar(uuid,text,text) is
  'Legacy placeholder helper retained only for migration history. Active sentence, clarification, and guide-reference workflows no longer call it.';
