-- Phase 4B — Batch 3 canonical guide enrichment
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
    then '[{"japanese":"この漢字は覚えにくいです。","japanese_furigana":"この[漢字|かんじ]は[覚|おぼ]えにくいです。","english":"This kanji is hard to remember."},{"japanese":"この靴は歩きにくいです。","japanese_furigana":"この[靴|くつ]は[歩|ある]きにくいです。","english":"These shoes are difficult to walk in."}]'::jsonb
    else reference_examples
  end,
  updated_at = now()
where user_id=(select user_id from private.app_owner)
  and pattern_key=public.repository_grammar_key('〜にくい');

update public.japanese_grammar_guides
set
  reference_examples = case
    when jsonb_typeof(coalesce(reference_examples,'[]'::jsonb))='array'
     and jsonb_array_length(coalesce(reference_examples,'[]'::jsonb))=0
    then '[{"japanese":"寝る前に、本を読みます。","japanese_furigana":"[寝|ね]る[前|まえ]に、[本|ほん]を[読|よ]みます。","english":"I read a book before going to bed."},{"japanese":"日本へ行く前に、日本語を勉強しました。","japanese_furigana":"[日本|にほん]へ[行|い]く[前|まえ]に、[日本語|にほんご]を[勉強|べんきょう]しました。","english":"I studied Japanese before going to Japan."}]'::jsonb
    else reference_examples
  end,
  updated_at = now()
where user_id=(select user_id from private.app_owner)
  and pattern_key=public.repository_grammar_key('〜前に');

update public.japanese_grammar_guides
set
  reference_examples = case
    when jsonb_typeof(coalesce(reference_examples,'[]'::jsonb))='array'
     and jsonb_array_length(coalesce(reference_examples,'[]'::jsonb))=0
    then '[{"japanese":"私は少し日本語が話せます。","japanese_furigana":"[私|わたし]は[少|すこ]し[日本語|にほんご]が[話|はな]せます。","english":"I can speak a little Japanese."},{"japanese":"今日は車を運転できません。","japanese_furigana":"[今日|きょう]は[車|くるま]を[運転|うんてん]できません。","english":"I cannot drive today."}]'::jsonb
    else reference_examples
  end,
  updated_at = now()
where user_id=(select user_id from private.app_owner)
  and pattern_key=public.repository_grammar_key('可能形');

update public.japanese_grammar_guides
set
  reference_examples = case
    when jsonb_typeof(coalesce(reference_examples,'[]'::jsonb))='array'
     and jsonb_array_length(coalesce(reference_examples,'[]'::jsonb))=0
    then '[{"japanese":"田中さんが来るか知っていますか。","japanese_furigana":"[田中|たなか]さんが[来|く]るか[知|し]っていますか。","english":"Do you know whether Mr. Tanaka is coming?"},{"japanese":"駅がどこにあるか分かりません。","japanese_furigana":"[駅|えき]がどこにあるか[分|わ]かりません。","english":"I do not know where the station is."}]'::jsonb
    else reference_examples
  end,
  updated_at = now()
where user_id=(select user_id from private.app_owner)
  and pattern_key=public.repository_grammar_key('〜か（埋め込み疑問）');

update public.japanese_grammar_guides
set
  reference_examples = case
    when jsonb_typeof(coalesce(reference_examples,'[]'::jsonb))='array'
     and jsonb_array_length(coalesce(reference_examples,'[]'::jsonb))=0
    then '[{"japanese":"昨日は食べすぎました。","japanese_furigana":"[昨日|きのう]は[食|た]べすぎました。","english":"I ate too much yesterday."},{"japanese":"このかばんは高すぎます。","japanese_furigana":"このかばんは[高|たか]すぎます。","english":"This bag is too expensive."}]'::jsonb
    else reference_examples
  end,
  updated_at = now()
where user_id=(select user_id from private.app_owner)
  and pattern_key=public.repository_grammar_key('〜すぎる');

update public.japanese_grammar_guides
set
  reference_examples = case
    when jsonb_typeof(coalesce(reference_examples,'[]'::jsonb))='array'
     and jsonb_array_length(coalesce(reference_examples,'[]'::jsonb))=0
    then '[{"japanese":"天気予報によると、明日は雨だそうです。","japanese_furigana":"[天気予報|てんきよほう]によると、[明日|あした]は[雨|あめ]だそうです。","english":"According to the weather forecast, I hear it will rain tomorrow."},{"japanese":"田中さんは来月結婚するそうです。","japanese_furigana":"[田中|たなか]さんは[来月|らいげつ][結婚|けっこん]するそうです。","english":"I hear that Mr. Tanaka is getting married next month."}]'::jsonb
    else reference_examples
  end,
  updated_at = now()
where user_id=(select user_id from private.app_owner)
  and pattern_key=public.repository_grammar_key('〜そうだ（伝聞）');

update public.japanese_grammar_guides
set
  reference_examples = case
    when jsonb_typeof(coalesce(reference_examples,'[]'::jsonb))='array'
     and jsonb_array_length(coalesce(reference_examples,'[]'::jsonb))=0
    then '[{"japanese":"早く寝なさい。","japanese_furigana":"[早|はや]く[寝|ね]なさい。","english":"Go to bed early."},{"japanese":"宿題をしなさい。","japanese_furigana":"[宿題|しゅくだい]をしなさい。","english":"Do your homework."}]'::jsonb
    else reference_examples
  end,
  updated_at = now()
where user_id=(select user_id from private.app_owner)
  and pattern_key=public.repository_grammar_key('〜なさい');

update public.japanese_grammar_guides
set
  reference_examples = case
    when jsonb_typeof(coalesce(reference_examples,'[]'::jsonb))='array'
     and jsonb_array_length(coalesce(reference_examples,'[]'::jsonb))=0
    then '[{"japanese":"赤いのをください。","japanese_furigana":"[赤|あか]いのをください。","english":"Please give me the red one."},{"japanese":"私の傘は大きいのです。","japanese_furigana":"[私|わたし]の[傘|かさ]は[大|おお]きいのです。","english":"My umbrella is the big one."}]'::jsonb
    else reference_examples
  end,
  updated_at = now()
where user_id=(select user_id from private.app_owner)
  and pattern_key=public.repository_grammar_key('〜の（代名詞）');

update public.japanese_grammar_guides
set
  reference_examples = case
    when jsonb_typeof(coalesce(reference_examples,'[]'::jsonb))='array'
     and jsonb_array_length(coalesce(reference_examples,'[]'::jsonb))=0
    then '[{"japanese":"もっと早く寝ればよかった。","japanese_furigana":"もっと[早|はや]く[寝|ね]ればよかった。","english":"I should have gone to bed earlier."},{"japanese":"傘を持ってくればよかった。","japanese_furigana":"[傘|かさ]を[持|も]ってくればよかった。","english":"I wish I had brought an umbrella."}]'::jsonb
    else reference_examples
  end,
  updated_at = now()
where user_id=(select user_id from private.app_owner)
  and pattern_key=public.repository_grammar_key('〜ばよかった');

update public.japanese_grammar_guides
set
  reference_examples = case
    when jsonb_typeof(coalesce(reference_examples,'[]'::jsonb))='array'
     and jsonb_array_length(coalesce(reference_examples,'[]'::jsonb))=0
    then '[{"japanese":"五時まで仕事をします。","japanese_furigana":"[五時|ごじ]まで[仕事|しごと]をします。","english":"I will work until five o''clock."},{"japanese":"駅まで歩きました。","japanese_furigana":"[駅|えき]まで[歩|ある]きました。","english":"I walked as far as the station."}]'::jsonb
    else reference_examples
  end,
  updated_at = now()
where user_id=(select user_id from private.app_owner)
  and pattern_key=public.repository_grammar_key('〜まで');

commit;

-- Verification: every Batch 3 guide should have all six core content fields.
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
    public.repository_grammar_key('〜にくい'),
    public.repository_grammar_key('〜前に'),
    public.repository_grammar_key('可能形'),
    public.repository_grammar_key('〜か（埋め込み疑問）'),
    public.repository_grammar_key('〜すぎる'),
    public.repository_grammar_key('〜そうだ（伝聞）'),
    public.repository_grammar_key('〜なさい'),
    public.repository_grammar_key('〜の（代名詞）'),
    public.repository_grammar_key('〜ばよかった'),
    public.repository_grammar_key('〜まで')
  )
order by pattern;
