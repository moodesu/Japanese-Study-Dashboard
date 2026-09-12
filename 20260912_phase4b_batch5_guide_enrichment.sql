-- Phase 4B — Batch 5 canonical guide enrichment
-- Source-grounded from the linked DOJG entries and supplementary mappings.
--
-- All ten guides already contain meaning, summary, formation, usage and nuance.
-- This migration fills only the missing reference_examples field.
--
-- Safety:
--   * Existing reference examples are preserved.
--   * Does not alter canonical identity, meaning, summary, formation, usage,
--     nuance, variants, clarifications, related grammar, personal examples,
--     DOJG links, supplementary links, slugs, register, or JLPT metadata.
--   * Rerunnable / idempotent.
--
-- Example sentences are newly authored Learning Hub examples and are not copied
-- from the private reference works.

begin;

update public.japanese_grammar_guides
set
  reference_examples = case
    when jsonb_typeof(coalesce(reference_examples,'[]'::jsonb))='array'
     and jsonb_array_length(coalesce(reference_examples,'[]'::jsonb))=0
    then '[{"japanese":"明日は来なくてもいいです。","japanese_furigana":"[明日|あした]は[来|こ]なくてもいいです。","english":"You do not have to come tomorrow."},{"japanese":"全部食べなくてもいいですよ。","japanese_furigana":"[全部|ぜんぶ][食|た]べなくてもいいですよ。","english":"You do not have to eat all of it."}]'::jsonb
    else reference_examples
  end,
  updated_at = now()
where user_id=(select user_id from private.app_owner)
  and pattern_key=public.repository_grammar_key('〜なくてもいい');

update public.japanese_grammar_guides
set
  reference_examples = case
    when jsonb_typeof(coalesce(reference_examples,'[]'::jsonb))='array'
     and jsonb_array_length(coalesce(reference_examples,'[]'::jsonb))=0
    then '[{"japanese":"今日は早く寝た方がいいです。","japanese_furigana":"[今日|きょう]は[早|はや]く[寝|ね]た[方|ほう]がいいです。","english":"You had better go to bed early today."},{"japanese":"そんなに心配しない方がいいですよ。","japanese_furigana":"そんなに[心配|しんぱい]しない[方|ほう]がいいですよ。","english":"You had better not worry so much."}]'::jsonb
    else reference_examples
  end,
  updated_at = now()
where user_id=(select user_id from private.app_owner)
  and pattern_key=public.repository_grammar_key('〜方がいい');

update public.japanese_grammar_guides
set
  reference_examples = case
    when jsonb_typeof(coalesce(reference_examples,'[]'::jsonb))='array'
     and jsonb_array_length(coalesce(reference_examples,'[]'::jsonb))=0
    then '[{"japanese":"私は先生に褒められました。","japanese_furigana":"[私|わたし]は[先生|せんせい]に[褒|ほ]められました。","english":"I was praised by the teacher."},{"japanese":"弟にケーキを食べられました。","japanese_furigana":"[弟|おとうと]にケーキを[食|た]べられました。","english":"My younger brother ate my cake on me."}]'::jsonb
    else reference_examples
  end,
  updated_at = now()
where user_id=(select user_id from private.app_owner)
  and pattern_key=public.repository_grammar_key('受身形');

update public.japanese_grammar_guides
set
  reference_examples = case
    when jsonb_typeof(coalesce(reference_examples,'[]'::jsonb))='array'
     and jsonb_array_length(coalesce(reference_examples,'[]'::jsonb))=0
    then '[{"japanese":"頭が痛くて、学校を休みました。","japanese_furigana":"[頭|あたま]が[痛|いた]くて、[学校|がっこう]を[休|やす]みました。","english":"I stayed home from school because I had a headache."},{"japanese":"電車が遅れて、会議に間に合いませんでした。","japanese_furigana":"[電車|でんしゃ]が[遅|おく]れて、[会議|かいぎ]に[間|ま]に[合|あ]いませんでした。","english":"Because the train was late, I did not make it to the meeting on time."}]'::jsonb
    else reference_examples
  end,
  updated_at = now()
where user_id=(select user_id from private.app_owner)
  and pattern_key=public.repository_grammar_key('〜て（理由）');

update public.japanese_grammar_guides
set
  reference_examples = case
    when jsonb_typeof(coalesce(reference_examples,'[]'::jsonb))='array'
     and jsonb_array_length(coalesce(reference_examples,'[]'::jsonb))=0
    then '[{"japanese":"こちらでよろしいでしょうか。","japanese_furigana":"こちらでよろしいでしょうか。","english":"Would this be all right?"},{"japanese":"お名前を教えていただけるでしょうか。","japanese_furigana":"お[名前|なまえ]を[教|おし]えていただけるでしょうか。","english":"Could you tell me your name?"}]'::jsonb
    else reference_examples
  end,
  updated_at = now()
where user_id=(select user_id from private.app_owner)
  and pattern_key=public.repository_grammar_key('〜でしょうか');

update public.japanese_grammar_guides
set
  reference_examples = case
    when jsonb_typeof(coalesce(reference_examples,'[]'::jsonb))='array'
     and jsonb_array_length(coalesce(reference_examples,'[]'::jsonb))=0
    then '[{"japanese":"明日は晴れるといいですね。","japanese_furigana":"[明日|あした]は[晴|は]れるといいですね。","english":"I hope it is sunny tomorrow."},{"japanese":"試験に合格するといいね。","japanese_furigana":"[試験|しけん]に[合格|ごうかく]するといいね。","english":"I hope you pass the exam."}]'::jsonb
    else reference_examples
  end,
  updated_at = now()
where user_id=(select user_id from private.app_owner)
  and pattern_key=public.repository_grammar_key('〜といい');

update public.japanese_grammar_guides
set
  reference_examples = case
    when jsonb_typeof(coalesce(reference_examples,'[]'::jsonb))='array'
     and jsonb_array_length(coalesce(reference_examples,'[]'::jsonb))=0
    then '[{"japanese":"荷物を持ちましょうか。","japanese_furigana":"[荷物|にもつ]を[持|も]ちましょうか。","english":"Shall I carry your luggage?"},{"japanese":"一緒に昼ご飯を食べましょうか。","japanese_furigana":"[一緒|いっしょ]に[昼|ひる]ご[飯|はん]を[食|た]べましょうか。","english":"Shall we have lunch together?"}]'::jsonb
    else reference_examples
  end,
  updated_at = now()
where user_id=(select user_id from private.app_owner)
  and pattern_key=public.repository_grammar_key('〜ましょうか');

update public.japanese_grammar_guides
set
  reference_examples = case
    when jsonb_typeof(coalesce(reference_examples,'[]'::jsonb))='array'
     and jsonb_array_length(coalesce(reference_examples,'[]'::jsonb))=0
    then '[{"japanese":"こちらにお名前をお書きください。","japanese_furigana":"こちらにお[名前|なまえ]をお[書|か]きください。","english":"Please write your name here."},{"japanese":"少々お待ちください。","japanese_furigana":"[少々|しょうしょう]お[待|ま]ちください。","english":"Please wait a moment."}]'::jsonb
    else reference_examples
  end,
  updated_at = now()
where user_id=(select user_id from private.app_owner)
  and pattern_key=public.repository_grammar_key('お〜ください／ご〜ください');

update public.japanese_grammar_guides
set
  reference_examples = case
    when jsonb_typeof(coalesce(reference_examples,'[]'::jsonb))='array'
     and jsonb_array_length(coalesce(reference_examples,'[]'::jsonb))=0
    then '[{"japanese":"少々お待ちいただけますか。","japanese_furigana":"[少々|しょうしょう]お[待|ま]ちいただけますか。","english":"Could you wait a moment, please?"},{"japanese":"こちらをご覧ください。","japanese_furigana":"こちらをご[覧|らん]ください。","english":"Please have a look at this."}]'::jsonb
    else reference_examples
  end,
  updated_at = now()
where user_id=(select user_id from private.app_owner)
  and pattern_key=public.repository_grammar_key('丁寧表現');

update public.japanese_grammar_guides
set
  reference_examples = case
    when jsonb_typeof(coalesce(reference_examples,'[]'::jsonb))='array'
     and jsonb_array_length(coalesce(reference_examples,'[]'::jsonb))=0
    then '[{"japanese":"子どもの時、毎日野菜を食べさせられました。","japanese_furigana":"[子|こ]どもの[時|とき]、[毎日|まいにち][野菜|やさい]を[食|た]べさせられました。","english":"When I was a child, I was made to eat vegetables every day."},{"japanese":"昨日、上司に遅くまで働かされました。","japanese_furigana":"[昨日|きのう]、[上司|じょうし]に[遅|おそ]くまで[働|はたら]かされました。","english":"Yesterday, my boss made me work until late."}]'::jsonb
    else reference_examples
  end,
  updated_at = now()
where user_id=(select user_id from private.app_owner)
  and pattern_key=public.repository_grammar_key('使役受身形');

commit;

-- Verification: every Batch 5 guide should have all six core content fields.
select
  pattern,
  case when coalesce(trim(meaning),'')<>'' and meaning<>'Guide pending' then 1 else 0 end as has_meaning,
  case when coalesce(trim(summary),'')<>'' and summary<>'Guide pending' then 1 else 0 end as has_summary,
  case when coalesce(array_length(formation,1),0)>0 then 1 else 0 end as has_formation,
  case when coalesce(array_length(usage,1),0)>0 then 1 else 0 end as has_usage,
  case when coalesce(array_length(nuance,1),0)>0 then 1 else 0 end as has_nuance,
  case
    when jsonb_typeof(coalesce(reference_examples,'[]'::jsonb))='array'
     and jsonb_array_length(coalesce(reference_examples,'[]'::jsonb))>0
    then 1 else 0
  end as has_reference_examples,
  jsonb_array_length(coalesce(reference_examples,'[]'::jsonb)) as reference_example_count
from public.japanese_grammar_guides
where user_id=(select user_id from private.app_owner)
  and pattern_key in (
    public.repository_grammar_key('〜なくてもいい'),
    public.repository_grammar_key('〜方がいい'),
    public.repository_grammar_key('受身形'),
    public.repository_grammar_key('〜て（理由）'),
    public.repository_grammar_key('〜でしょうか'),
    public.repository_grammar_key('〜といい'),
    public.repository_grammar_key('〜ましょうか'),
    public.repository_grammar_key('お〜ください／ご〜ください'),
    public.repository_grammar_key('丁寧表現'),
    public.repository_grammar_key('使役受身形')
  )
order by pattern;
