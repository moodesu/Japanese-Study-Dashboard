-- Phase 6D — Strict canonical sentence import
-- Final repo migration matching the live Supabase state.
--
-- Goals:
--   * sentence imports may only attach to existing complete canonical guides
--   * variants/surface labels must be resolved before the RPC is called
--   * no placeholder creation path remains inside the sentence-import RPC
--   * exact duplicate annotations are prevented at the database layer

create unique index if not exists japanese_repository_grammar_annotation_unique
  on public.japanese_repository_grammar
  (user_id, repository_id, grammar_id, surface);

create or replace function public.import_repository_with_canonical_grammar(p_entries jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid:=auth.uid(); item jsonb; payload jsonb; annotation jsonb;
  imported public.japanese_repository; sentence public.japanese_repository;
  guide public.japanese_grammar_guides; linkrow public.japanese_repository_grammar;
  supplied text[]; canonicals text[]; operation text;
  canonical_key text; requested_slug text;
  result_entries jsonb:='[]'; result_guides jsonb:='[]'; result_links jsonb:='[]'; result_operations jsonb:='[]';
  created_count integer:=0; updated_count integer:=0;
begin
  if caller is null then raise exception 'Sign in before importing.'; end if;
  if jsonb_typeof(p_entries) is distinct from 'array' or jsonb_array_length(p_entries) not between 1 and 100 then
    raise exception 'Import between 1 and 100 sentences.';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(caller::text,0));

  for item in select value from jsonb_array_elements(p_entries) loop
    if jsonb_typeof(item) is distinct from 'object'
      or item-array['entry','grammar_points','import_fields']<>'{}'::jsonb
      or not(item ?& array['entry','grammar_points','import_fields'])
      or jsonb_typeof(item->'entry') is distinct from 'object'
      or jsonb_typeof(item->'grammar_points') is distinct from 'array'
      or jsonb_typeof(item->'import_fields') is distinct from 'array' then
      raise exception 'Invalid canonical sentence import.';
    end if;

    payload=item->'entry';
    supplied=array(select jsonb_array_elements_text(item->'import_fields'));
    if exists (
      select 1 from unnest(supplied) field
      where not(field=any(array[
        'status','intent_english','original_japanese','original_japanese_furigana',
        'japanese_furigana','english','explanation','tags','lesson_number','book_id',
        'register','source_type','source_detail','error_types','notes'
      ]))
    ) then raise exception 'Invalid imported sentence field list.'; end if;

    select * into imported
    from jsonb_populate_record(null::public.japanese_repository,payload);

    if imported.japanese is null
      or trim(imported.japanese)=''
      or (
        coalesce(imported.japanese_furigana,'')<>''
        and regexp_replace(
          imported.japanese_furigana,
          '\[([^]|]+)\|([^]]+)\]',
          '\1',
          'g'
        )<>imported.japanese
      )
    then
      raise exception 'Invalid sentence or furigana.';
    end if;

    sentence=null;
    if coalesce(imported.entry_type,'sentence')='sentence' then
      select * into sentence
      from public.japanese_repository
      where user_id=caller
        and entry_type='sentence'
        and japanese=imported.japanese
      for update;
    end if;

    if sentence.id is null then
      insert into public.japanese_repository(
        user_id,entry_type,status,intent_english,original_japanese,original_japanese_furigana,
        japanese,japanese_furigana,english,explanation,grammar_points,tags,lesson_number,
        book_id,register,source_type,source_detail,error_types,notes
      ) values (
        caller,coalesce(imported.entry_type,'sentence'),coalesce(imported.status,'learning'),
        coalesce(imported.intent_english,''),coalesce(imported.original_japanese,''),
        coalesce(imported.original_japanese_furigana,''),imported.japanese,
        coalesce(imported.japanese_furigana,''),coalesce(imported.english,''),
        coalesce(imported.explanation,''),coalesce(imported.grammar_points,'{}'),
        coalesce(imported.tags,'{}'),imported.lesson_number,imported.book_id,
        coalesce(imported.register,'neutral'),coalesce(imported.source_type,'personal'),
        coalesce(imported.source_detail,''),coalesce(imported.error_types,'{}'),
        coalesce(imported.notes,'')
      )
      returning * into sentence;
      operation='created';
      created_count=created_count+1;
    else
      update public.japanese_repository
      set
        status=case when 'status'=any(supplied) then coalesce(imported.status,'learning') else status end,
        intent_english=case when 'intent_english'=any(supplied) then coalesce(imported.intent_english,'') else intent_english end,
        original_japanese=case when 'original_japanese'=any(supplied) then coalesce(imported.original_japanese,'') else original_japanese end,
        original_japanese_furigana=case when 'original_japanese_furigana'=any(supplied) then coalesce(imported.original_japanese_furigana,'') else original_japanese_furigana end,
        japanese_furigana=case when 'japanese_furigana'=any(supplied) then coalesce(imported.japanese_furigana,'') else japanese_furigana end,
        english=case when 'english'=any(supplied) then coalesce(imported.english,'') else english end,
        explanation=case when 'explanation'=any(supplied) then coalesce(imported.explanation,'') else explanation end,
        tags=case when 'tags'=any(supplied) then coalesce(imported.tags,'{}') else tags end,
        lesson_number=case when 'lesson_number'=any(supplied) then imported.lesson_number else lesson_number end,
        book_id=case when 'book_id'=any(supplied) then imported.book_id else book_id end,
        register=case when 'register'=any(supplied) then coalesce(imported.register,'neutral') else register end,
        source_type=case when 'source_type'=any(supplied) then coalesce(imported.source_type,'personal') else source_type end,
        source_detail=case when 'source_detail'=any(supplied) then coalesce(imported.source_detail,'') else source_detail end,
        error_types=case when 'error_types'=any(supplied) then coalesce(imported.error_types,'{}') else error_types end,
        notes=case when 'notes'=any(supplied) then coalesce(imported.notes,'') else notes end
      where id=sentence.id and user_id=caller
      returning * into sentence;

      delete from public.japanese_repository_grammar
      where repository_id=sentence.id and user_id=caller;

      operation='updated';
      updated_count=updated_count+1;
    end if;

    canonicals='{}';

    for annotation in
      select value from jsonb_array_elements(item->'grammar_points')
    loop
      if jsonb_typeof(annotation) is distinct from 'object'
        or annotation-array['canonical','surface','note','guide_slug']<>'{}'::jsonb
        or not(annotation ?& array['canonical','surface','note'])
        or jsonb_typeof(annotation->'canonical')<>'string'
        or jsonb_typeof(annotation->'surface')<>'string'
        or jsonb_typeof(annotation->'note')<>'string'
        or (
          annotation ? 'guide_slug'
          and jsonb_typeof(annotation->'guide_slug')<>'string'
        )
      then
        raise exception 'Invalid canonical grammar annotation.';
      end if;

      if annotation->>'surface'<>'' and position(annotation->>'surface' in sentence.japanese)=0 then
        raise exception 'Grammar surface is not present in the sentence.';
      end if;

      canonical_key=public.repository_grammar_key(annotation->>'canonical');
      requested_slug=coalesce(annotation->>'guide_slug','');

      if coalesce(canonical_key,'')='' then
        raise exception 'Canonical grammar is required.';
      end if;

      guide=null;
      select * into guide
      from public.japanese_grammar_guides
      where user_id=caller
        and pattern_key=canonical_key
      for share;

      if guide.id is null then
        raise exception
          'Sentence import references missing canonical grammar: %. Resolve the label against the Grammar Library before importing.',
          annotation->>'canonical';
      end if;

      if requested_slug<>'' and guide.slug<>requested_slug then
        raise exception
          'Grammar guide slug mismatch for %: expected %, received %.',
          guide.pattern,guide.slug,requested_slug;
      end if;

      if guide.guide_status<>'complete' or guide.is_placeholder then
        raise exception
          'Sentence import references incomplete canonical grammar: %. Complete the guide before importing the sentence.',
          guide.pattern;
      end if;

      insert into public.japanese_repository_grammar(
        repository_id,user_id,grammar_id,surface,note
      ) values (
        sentence.id,caller,guide.id,annotation->>'surface',annotation->>'note'
      )
      returning * into linkrow;

      if not(guide.pattern=any(canonicals)) then
        canonicals=array_append(canonicals,guide.pattern);
      end if;

      result_guides=result_guides||jsonb_build_array(to_jsonb(guide));
      result_links=result_links||jsonb_build_array(to_jsonb(linkrow));
    end loop;

    update public.japanese_repository
    set grammar_points=canonicals
    where id=sentence.id
    returning * into sentence;

    result_entries=result_entries||jsonb_build_array(to_jsonb(sentence));
    result_operations=result_operations||jsonb_build_array(
      jsonb_build_object('id',sentence.id,'operation',operation)
    );
  end loop;

  return jsonb_build_object(
    'entries',result_entries,
    'guides',result_guides,
    'links',result_links,
    'operations',result_operations,
    'created_count',created_count,
    'updated_count',updated_count
  );
end;
$$;

revoke all on function public.import_repository_with_canonical_grammar(jsonb)
  from public, anon;

grant execute on function public.import_repository_with_canonical_grammar(jsonb)
  to authenticated;
