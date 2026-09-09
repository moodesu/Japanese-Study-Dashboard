-- Grammar in Depth for Beginning Japanese Learners
-- Part 2 integrates as a private TOBIRA II-linked reference resource.
-- Upload the purchased PDF to:
-- textbook-pdfs/supplementary/grammar-in-depth/grammar-in-depth.pdf

begin;

insert into public.supplementary_resources(
  user_id,slug,title,english_title,resource_type,description,private_resource,optional
)
select
  owner.user_id,
  'grammar-in-depth-beginning-japanese',
  'Grammar in Depth for Beginning Japanese Learners',
  'Grammar in Depth for Beginning Japanese Learners',
  'grammar_reference',
  'Detailed supplementary grammar explanations aligned with TOBIRA I and TOBIRA II. Part 2 corresponds to TOBIRA II.',
  true,
  true
from private.app_owner owner
on conflict(user_id,slug) do update set
  title=excluded.title,
  english_title=excluded.english_title,
  resource_type=excluded.resource_type,
  description=excluded.description,
  private_resource=excluded.private_resource,
  optional=excluded.optional,
  updated_at=now();

with part(part_key,storage_path,source_pdf_start,source_pdf_end,sort_order) as (values
  ('full','supplementary/grammar-in-depth/grammar-in-depth.pdf',1,83,1)
)
insert into public.supplementary_resource_parts(
  resource_id,part_key,storage_path,source_pdf_start,source_pdf_end,sort_order
)
select resource.id,part.part_key,part.storage_path,part.source_pdf_start,part.source_pdf_end,part.sort_order
from public.supplementary_resources resource
join private.app_owner owner on owner.user_id=resource.user_id
cross join part
where resource.slug='grammar-in-depth-beginning-japanese'
on conflict(resource_id,part_key) do update set
  storage_path=excluded.storage_path,
  source_pdf_start=excluded.source_pdf_start,
  source_pdf_end=excluded.source_pdf_end,
  sort_order=excluded.sort_order;

with unit(unit_number,source_heading,printed_page,source_pdf_page,local_pdf_page,sort_order) as (values
  (1,'A1 · 時 vs. 時に',33,33,33,1),
  (2,'A2 · V-te から vs. 後で',34,34,34,2),
  (3,'A3 · ながら vs. 間（に）',35,35,35,3),
  (4,'B1 · ので vs. から',36,36,36,4),
  (5,'B2 · のに vs. けれど／けど',37,37,37,5),
  (6,'B3 · のに vs. ても',39,39,39,6),
  (7,'B4 · たら、と、ば and なら',40,40,40,7),
  (8,'B5 · ～ないで vs. ～なくて',46,46,46,8),
  (9,'C1 · ～そう [Impression] vs. ～みたい／よう [Conjecture]',47,47,47,9),
  (10,'C2 · V-te おく vs. V-te ある',49,49,49,10),
  (11,'C3 · V-masu にくい vs. 難しい',49,49,49,11),
  (12,'D1 · V1-te V2 vs. V1-te から V2',50,50,50,12),
  (13,'D2 · Potential forms vs. Vことができる',53,53,53,13),
  (14,'D3 · S1し、S2し',54,54,54,14),
  (15,'D4 · ～たらどうですか vs. ～た／～ない方がいい',55,55,55,15),
  (16,'D5 · V-masu に行く／来る vs. Vために',56,56,56,16),
  (17,'D6 · Permission and obligation expressions',56,56,56,17),
  (18,'D7 · ～ようと思う vs. ～つもりだ',58,58,58,18),
  (19,'E1 · は vs. が',59,59,59,19),
  (20,'E2 · しか vs. だけ',63,63,63,20),
  (21,'E3 · Noun modification clauses',65,65,65,21),
  (22,'E4 · Tense in time clauses',68,68,68,22),
  (23,'E5 · Nominalizers の vs. こと',69,69,69,23),
  (24,'E6-1 · 行く and 来る',71,71,71,24),
  (25,'E6-2 · ～ていく and ～てくる',71,71,71,25),
  (26,'E6-3 · あげる、くれる and もらう',72,72,72,26),
  (27,'E6-4 · Passive sentences',74,74,74,27),
  (28,'E6-5 · Protagonist viewpoint in fiction',74,74,74,28),
  (29,'E7 · Adj(na)／Nだ: Why does だ drop in some situations?',75,75,75,29)
)
insert into public.supplementary_units(
  resource_id,unit_number,source_heading,printed_page,source_pdf_page,
  resource_part_id,local_pdf_page,sort_order
)
select
  resource.id,unit.unit_number,unit.source_heading,unit.printed_page,unit.source_pdf_page,
  part.id,unit.local_pdf_page,unit.sort_order
from public.supplementary_resources resource
join private.app_owner owner on owner.user_id=resource.user_id
join public.supplementary_resource_parts part
  on part.resource_id=resource.id and part.part_key='full'
cross join unit
where resource.slug='grammar-in-depth-beginning-japanese'
on conflict(resource_id,unit_number) do update set
  source_heading=excluded.source_heading,
  printed_page=excluded.printed_page,
  source_pdf_page=excluded.source_pdf_page,
  resource_part_id=excluded.resource_part_id,
  local_pdf_page=excluded.local_pdf_page,
  sort_order=excluded.sort_order,
  updated_at=now();

-- Canonical Grammar Library links.
-- Missing canonical guides are intentionally skipped; re-running this migration
-- later will populate them after those guides exist.
with mapping(canonical,unit_number,relationship,note) as (values
  ('〜時',1,'related','Grammar in Depth compares 時 with 時に.'),
  ('〜てから',2,'strong','Grammar in Depth compares V-te から with V-past 後で.'),
  ('〜ながら',3,'strong','Grammar in Depth contrasts simultaneous ながら with 間（に）.'),
  ('〜ので',4,'strong','Grammar in Depth contrasts implicit ので with explicit から.'),
  ('〜のに',5,'strong','Grammar in Depth contrasts のに with けれど／けど.'),
  ('〜のに',6,'strong','Grammar in Depth contrasts のに with ても.'),
  ('〜ても',6,'strong','Grammar in Depth contrasts ても with のに.'),
  ('〜たら',7,'exact','Part 2 conditional comparison: たら・と・ば・なら.'),
  ('〜と',7,'exact','Part 2 conditional comparison: たら・と・ば・なら.'),
  ('〜ば',7,'exact','Part 2 conditional comparison: たら・と・ば・なら.'),
  ('〜なら',7,'exact','Part 2 conditional comparison: たら・と・ば・なら.'),
  ('〜ないで',8,'strong','Grammar in Depth contrasts ～ないで with ～なくて.'),
  ('〜そうだ',9,'related','Appearance/impression そう contrasted with みたい／よう conjecture.'),
  ('〜ようだ',9,'related','Conjecture よう contrasted with appearance そう.'),
  ('〜ておく',10,'exact','Grammar in Depth compares preparatory action 〜ておく with resultant-state 〜てある.'),
  ('〜てある',10,'exact','Grammar in Depth compares resultant-state 〜てある with preparatory action 〜ておく.'),
  ('〜にくい',11,'strong','Grammar in Depth contrasts V-masu にくい with 難しい.'),
  ('〜ことができる',13,'strong','Grammar in Depth compares potential forms with Vことができる.'),
  ('〜し',14,'strong','Grammar in Depth explains S1し、S2し.'),
  ('〜たら',15,'related','Suggestion use in ～たらどうですか contrasted with ～方がいい.'),
  ('〜た方がいい',15,'strong','Grammar in Depth compares ～たらどうですか with ～た／～ない方がいい.'),
  ('〜ない方がいい',15,'strong','Grammar in Depth compares negative advice with ～たらどうですか.'),
  ('〜ために',16,'strong','Grammar in Depth compares purpose V-masu に行く／来る with Vために.'),
  ('〜てもいい',17,'strong','Permission expression grouped with prohibition and obligation forms.'),
  ('〜てはいけない',17,'strong','Prohibition expression grouped with permission and obligation forms.'),
  ('〜なくてはいけない',17,'strong','Obligation expression grouped with permission/prohibition forms.'),
  ('〜なくてもいい',17,'strong','Lack-of-obligation expression grouped with permission/prohibition forms.'),
  ('〜ようと思う',18,'exact','Grammar in Depth directly compares 〜ようと思う with 〜つもりだ.'),
  ('〜つもり',18,'exact','Grammar in Depth directly compares 〜つもりだ with 〜ようと思う.'),
  ('〜しか',20,'strong','Grammar in Depth contrasts しか with だけ.'),
  ('〜だけ',20,'strong','Grammar in Depth contrasts だけ with しか.'),
  ('行く',24,'exact','Viewpoint reference for 行く versus 来る.'),
  ('来る',24,'exact','Viewpoint reference for 来る versus 行く.'),
  ('〜ていく',25,'exact','Grammar in Depth viewpoint explanation for 〜ていく.'),
  ('〜てくる',25,'exact','Grammar in Depth viewpoint explanation for 〜てくる.'),
  ('〜てくれる',26,'strong','Giving/receiving viewpoint framework for くれる and benefit expressions.'),
  ('〜てもらう',26,'strong','Giving/receiving viewpoint framework for もらう and benefit expressions.'),
  ('〜かもしれない',29,'related','Cross-cutting explanation of why だ drops before sentence-ending expressions.'),
  ('〜はず',29,'related','Cross-cutting explanation of の／な before dependent nouns such as はず.'),
  ('〜ようだ',29,'related','Cross-cutting explanation of の／な before よう.'),
  ('〜ので',29,'related','Cross-cutting explanation of な before ので.'),
  ('〜のに',29,'related','Cross-cutting explanation of な before のに.')
)
insert into public.grammar_supplementary_links(
  user_id,grammar_id,supplementary_unit_id,relationship,note
)
select
  guide.user_id,
  guide.id,
  unit.id,
  mapping.relationship,
  mapping.note
from mapping
join public.japanese_grammar_guides guide
  on guide.pattern_key=public.repository_grammar_key(mapping.canonical)
join public.supplementary_resources resource
  on resource.user_id=guide.user_id
 and resource.slug='grammar-in-depth-beginning-japanese'
join public.supplementary_units unit
  on unit.resource_id=resource.id
 and unit.unit_number=mapping.unit_number
join private.app_owner owner
  on owner.user_id=guide.user_id
on conflict(grammar_id,supplementary_unit_id) do update set
  relationship=excluded.relationship,
  note=excluded.note,
  updated_at=now();

commit;
