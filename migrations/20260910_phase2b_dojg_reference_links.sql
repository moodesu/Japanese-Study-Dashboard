-- Phase 2B — canonical Grammar Library ↔ DOJG references
-- Seeds only reviewed mappings from the Phase 2A audit.
-- It does NOT create the 554 new DOJG-derived canonical guides yet.
-- Rerunnable.

begin;

create table if not exists public.grammar_dictionary_references (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  grammar_id uuid not null references public.japanese_grammar_guides(id) on delete cascade,
  dictionary_entry_id text not null,
  relationship text not null default 'primary'
    check (relationship in ('primary','expanded','related')),
  source_volume text not null
    check (source_volume in ('Basic','Intermediate','Advanced')),
  created_at timestamptz not null default now(),
  unique(grammar_id,dictionary_entry_id)
);

create index if not exists grammar_dictionary_references_user_grammar_idx
  on public.grammar_dictionary_references(user_id,grammar_id);

alter table public.grammar_dictionary_references enable row level security;

drop policy if exists grammar_dictionary_references_owner_select
  on public.grammar_dictionary_references;
create policy grammar_dictionary_references_owner_select
  on public.grammar_dictionary_references
  for select to authenticated
  using (user_id=auth.uid());

drop policy if exists grammar_dictionary_references_owner_insert
  on public.grammar_dictionary_references;
create policy grammar_dictionary_references_owner_insert
  on public.grammar_dictionary_references
  for insert to authenticated
  with check (user_id=auth.uid());

drop policy if exists grammar_dictionary_references_owner_update
  on public.grammar_dictionary_references;
create policy grammar_dictionary_references_owner_update
  on public.grammar_dictionary_references
  for update to authenticated
  using (user_id=auth.uid())
  with check (user_id=auth.uid());

drop policy if exists grammar_dictionary_references_owner_delete
  on public.grammar_dictionary_references;
create policy grammar_dictionary_references_owner_delete
  on public.grammar_dictionary_references
  for delete to authenticated
  using (user_id=auth.uid());

with reviewed(volume,headword,entry_id,canonical,relationship) as (values
    ('Basic','かもしれない','e5ee6401e46cead8c7e7453f726270b929419d0feaac986288ba57566f9d0b71','〜かもしれない','primary'),
    ('Basic','がる','8694cb88db13394cf27a79fd793fa92c15c05108aebffb5867c1c3190e4cae04','〜がる','primary'),
    ('Basic','ことにする','ab4dc23557901ecfad9a163f89478906f209fc80f460b3d57080bad5922aa44c','〜ことにする','primary'),
    ('Basic','ごろ','816f0fc528c9c3768eed5efbb24eac67e2799c184b072020a032810361bd1603','〜ごろ','primary'),
    ('Basic','し','caf53720566e616f002a0fdf82dbee73dc92105a549fc4d163a9d2112af65bfd','〜し','primary'),
    ('Basic','たい','68f68ffc891b59f4c596da0ddde263e6e38aba0d3c41d2a27b91c726621b616a','〜たい','primary'),
    ('Basic','たら','582b4162bc56e6076ee2388eec55d90a737483ed4d28c323c0683aea91ac4e27','〜たら','primary'),
    ('Basic','たらどうですか','d1c0314021a6286ad45c33d62309e0cc14e9ca850a4f7bc854c39c9e1ec7c523','〜たらどうですか','primary'),
    ('Basic','だろう','b877c0833faab51d270499bca1f859406ae840f1307f2b19cff4d1c55c384f2e','〜だろう','primary'),
    ('Basic','つもり','303edabcf154796478f843fd8477523c18c03afa94d776408b7b69be96bffb09','〜つもり','primary'),
    ('Basic','ても','94125fd0746fd029dfdee324db7142c44b56cd93d1858078ebd8e5fca3a29509','〜ても','primary'),
    ('Basic','てもいい','766ed9ae7af609bd97da443e7e1da0c234832042b45fffb34f0553d74f879498','〜てもいい','primary'),
    ('Basic','ないで','40da54baabae26f65557d6c83dc2d0c8881781e173711dc45688291dec8669cc','〜ないで','primary'),
    ('Basic','ながら','cba5c29c7a294c9406b1135ead7b2e3aa74db73369ed237a9098e155772fd215','〜ながら','primary'),
    ('Basic','なくて','188bbb7003a7b55936b3b73aaf681f648673db2cac927ff035c452b3e754c013','〜なくて','primary'),
    ('Basic','なくなる','5e320824d5cea517debbd11987c1af4769ff7338153115cc79897e475a298979','〜なくなる','primary'),
    ('Basic','なさい','6f12b36433e9d4564fb93813601707ecf983d9e9a54a270a500d616d82b9f4de','〜なさい','primary'),
    ('Basic','なら','5ce582df7da7b190c50662e4d006a734c05e92ec06e42e732ad010322ef60cde','〜なら','primary'),
    ('Basic','にする','36bf068e5322d886202196f7035f48d6a3819b86d4094fdcfdfa93ece04eae4b','〜にする','primary'),
    ('Basic','ので','a6596fb24b5eafe91f5356f70a7b7bf928ede9f0fc751d66cec050ec3b42028b','〜ので','primary'),
    ('Basic','ば','e095c5ffe8379ffae1303ea6a1e5294af054bbe7709d53499cea52e21489167f','〜ば','primary'),
    ('Basic','はず','857e5f23b465bd49e712145545e0c7333fcc7f7ef46d92d3ad5af1a789989bcb','〜はず','primary'),
    ('Basic','ばよかった','b5bac89bdb57a66d716260dd778a3c1fd057ab24a080b2d61989b268551e0a53','〜ばよかった','primary'),
    ('Basic','まで','6d790ec055c52847ab6de4634eca1ba8f3c330652737ea777b5028e3fa26f538','〜まで','primary'),
    ('Basic','までに','edfe86e8a09100c15bc571ae3a6840e3f045e03a789b7c55f199b39eb25c215e','〜までに','primary'),
    ('Basic','ようだ','dae4b7ed60100765e4f68772cdd695b24fda3a1187d75417fac015965df0cad5','〜ようだ','primary'),
    ('Basic','ようと思う','5ea76fb507e61359dc46bdf1dd9c9e7d43b12c80681da9a9b97c6c5ffd550a67','〜ようと思う','primary'),
    ('Basic','ようにする','855def453b5199081272693e4ac1aa9bde6d00324092a86f494b54e2d3218d4f','〜ようにする','primary'),
    ('Basic','ようになる','84f5e1ffcf463b3985ad0c2425107edd03797e32f723d4da9f1da8358071fbe4','〜ようになる','primary'),
    ('Basic','らしい','50ba4ae9599de6842d0f94b634d3c9b90e4d4589686451d2b2b1881ee1ee976d','〜らしい','primary'),
    ('Intermediate','わけではない','a4f7395ab189693ccbf9e317e908971a383cac044a24612ec1f14ad7790a8cd9','〜わけではない','primary'),
    ('Basic','あげる (1)','a6b2e0b7925b2e2e35f1525b4266fa424586e72d28bc53a41c76e85817fd6f51','あげる','primary'),
    ('Basic','あげる (2)','b8313c0b228bb07fcee9399a37e4cd62d7c70b66bba897afeb19d0c5e5c1151d','〜てあげる','primary'),
    ('Basic','ことが出来る・できる','2eea00069b8619bf6e80ec1201ab87132831f21360f70512191491cc6af62387','〜ことができる','primary'),
    ('Basic','のに (1)','20fed37c7a0a5c4e6572110633502c37e72d1af18014b81e75070a6aea68e1b8','〜のに','primary'),
    ('Basic','もらう (1)','706bee05703782198e1df841aec14d1b21ae2bf93f26b5be3861de72fb79dfd0','もらう','primary'),
    ('Basic','もらう (2)','25934aa45c804a856b7be8d5e99e204e845c7096829a6d8b51c37e8cfa0006db','〜てもらう','primary'),
    ('Basic','出す・だす','74ca538f7321ac0f4f70605136abe6ea0f57009a8658c746fb979f96e59f3bc4','〜出す','primary'),
    ('Basic','前に・まえに','51287b6c66e5d68285af4d2a2e3efac77cdfb83af36801c82858ad4e8dc293b9','〜前に','primary'),
    ('Basic','呉れる・くれる (1)','8d78cb69d97c254f470de3d06a167e475d38c21dd4f4e2945e2b93e5a3c8ac81','くれる','primary'),
    ('Basic','呉れる・くれる (2)','9e1cfe19b2ca1405059df281a9cd0d1a116c3ffba0b2e7ec2b8b483f031d2cf4','〜てくれる','primary'),
    ('Basic','始める・はじめる','12b2a4880310c98ea532133632a2114e6b1de7cdde225d1796f9d7f50660cd2f','〜始める','primary'),
    ('Basic','方・かた','a05b97dd3b2ab2779507081d3cbf3fd355564e1bf1d92cd8ece50701aacb3425','〜方','primary'),
    ('Basic','易い・やすい','fc04cfe1d7dd824da676e130256d186fba00b1dbb484d47d3c5321789d0b25b9','〜やすい','primary'),
    ('Basic','時・とき','47d014c03e74fcf15555977fa67295d1bfb0f5a85de302f05b4b2ae9fce1bf3d','〜時','primary'),
    ('Basic','来る・くる (1)','c703c569b3c386526962e0fc9c35ed2fc925bb32a1d0ee60103aef758a5557ee','来る','primary'),
    ('Basic','来る・くる (2)','505932929128609abe775a108269f2a96931e170f0fde59c3f943b8b0cb7b942','〜てくる','primary'),
    ('Basic','欲しい・ほしい (1)','8a2e18656513c097bda69327b1aa7d7f3f438dde72c06f9d38d4e0e484a2b637','欲しい','primary'),
    ('Basic','欲しい・ほしい (2)','0f0a931a8cee33236862c71339188b1ef2fde097044660ebe061d29e967f8465','〜て欲しい','primary'),
    ('Basic','為（に）・ため（に）','a1b56add2ae2eb8575494025daf156c46d62991246b7e7e7e0ee6ce5335b9aa2','〜ために','primary'),
    ('Basic','終わる・おわる','89522812441efda766ede078e7fe4931a6fdb96ae0d0b7adef4fc67074c1bcc8','〜終わる','primary'),
    ('Basic','行く・いく (1)','b3567164a5d5534468613edeca18b67b9c7ddb1ccd1fb3390514a9060ce311eb','行く','primary'),
    ('Basic','行く・いく (2)','802740647ef40f472b2b172d2d2273470e2d068437e5e9d63d71cf9e4b653928','〜ていく','primary'),
    ('Basic','過ぎる・すぎる','ab6d33beb06a3f967c916d643c7a5be5f91031967731fa50c2a64cf4052cf0f1','〜すぎる','primary'),
    ('Basic','難い・にくい','4b92805c60f8ee16776d7498dd3dd776ab116549de111df410e89debec2ee92a','〜にくい','primary'),
    ('Advanced','だけ','28e6a5ba853b7e89a51e94f6110fad798e44f2bf9123dcef3f6f110e8124cb1a','〜だけ','expanded'),
    ('Basic','くらい','1e2366bb59fd78a3371c546c6b74823bc3589ffca9f8fef3d3ef738af3848206','〜くらい','primary'),
    ('Basic','ことになる','66b7041ee76e0578dde33d8ba94acda28fb3dbb10cdd48e938c90d01618836ec','〜ことになる','primary'),
    ('Basic','だけ','ae49bf94b657ba8f7eaf4fd4706f960512f27beb20185c5e533d155906ef2788','〜だけ','primary'),
    ('Basic','ほど','202e7967ae292c9056e4f073743a313756d67289818f3017385ae6790e54b632','〜ほど','primary'),
    ('Basic','わけだ','7b07a815f3f9bb90fbd21c7fb79a95932fe0fc7fd8ed654efcebdec445f9126f','〜わけだ','primary'),
    ('Basic','間・あいだ(に)','cbdf52127fed41f5e28fec4f08c1fed4336145d31aa0c227f0c54db483fa3004','〜間','primary'),
    ('Basic','間・あいだ(に)','cbdf52127fed41f5e28fec4f08c1fed4336145d31aa0c227f0c54db483fa3004','〜間に','primary'),
    ('Intermediate','くらい','d02d2ddd2a53b74032bfa26428db097054aed240f824d9c81b40d645d32e9045','〜くらい','expanded'),
    ('Intermediate','ことになる','9ffb1d84ca5ccb001dacebd4b86d63d8c5d55f8d552cf9b1186c395e37933561','〜ことになる','expanded'),
    ('Intermediate','ほど','af9d9aa26f7df314003dfeffcf6e44e794f8b87b8ab73e88abd97ba76d4acbc7','〜ほど','expanded'),
    ('Intermediate','わけだ','034f6f1e96909880b5b5920941eb230293fdf190a59b720b7c0ab42f9ef31b87','〜わけだ','expanded')
),
owner as (
  select user_id from private.app_owner
),
resolved as (
  select
    o.user_id,
    g.id as grammar_id,
    reviewed.entry_id as dictionary_entry_id,
    reviewed.relationship,
    reviewed.volume as source_volume
  from reviewed
  cross join owner o
  join public.japanese_grammar_guides g
    on g.user_id=o.user_id
   and g.pattern_key=public.repository_grammar_key(reviewed.canonical)
  join public.japanese_dictionary_entries d
    on d.user_id=o.user_id
   and d.id=reviewed.entry_id
)
insert into public.grammar_dictionary_references(
  user_id,grammar_id,dictionary_entry_id,relationship,source_volume
)
select user_id,grammar_id,dictionary_entry_id,relationship,source_volume
from resolved
on conflict(grammar_id,dictionary_entry_id) do update set
  relationship=excluded.relationship,
  source_volume=excluded.source_volume;

commit;

-- Verification
select
  g.pattern,
  r.relationship,
  r.source_volume,
  d.headword,
  d.summary
from public.grammar_dictionary_references r
join public.japanese_grammar_guides g on g.id=r.grammar_id
join public.japanese_dictionary_entries d
  on d.user_id=r.user_id and d.id=r.dictionary_entry_id
where r.user_id=auth.uid()
order by g.pattern,r.source_volume,d.headword;
