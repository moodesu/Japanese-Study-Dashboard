-- Independent supplementary grammar resources linked through canonical guides.
-- Copyrighted PDFs remain private in the existing textbook-pdfs bucket.
begin;

create table if not exists public.supplementary_resources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  slug text not null,
  title text not null,
  english_title text,
  resource_type text not null,
  description text not null default '',
  private_resource boolean not null default true,
  optional boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id,slug)
);

create table if not exists public.supplementary_resource_parts (
  id uuid primary key default gen_random_uuid(),
  resource_id uuid not null references public.supplementary_resources(id) on delete cascade,
  part_key text not null,
  storage_path text not null,
  source_pdf_start integer not null check(source_pdf_start>0),
  source_pdf_end integer not null check(source_pdf_end>=source_pdf_start),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique(resource_id,part_key),
  unique(resource_id,storage_path)
);

create table if not exists public.supplementary_units (
  id uuid primary key default gen_random_uuid(),
  resource_id uuid not null references public.supplementary_resources(id) on delete cascade,
  unit_number integer not null check(unit_number>0),
  source_heading text not null,
  printed_page integer not null check(printed_page>0),
  source_pdf_page integer not null check(source_pdf_page>0),
  resource_part_id uuid not null references public.supplementary_resource_parts(id) on delete restrict,
  local_pdf_page integer not null check(local_pdf_page>0),
  publisher_slide_filename text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(resource_id,unit_number)
);

create table if not exists public.grammar_supplementary_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  grammar_id uuid not null references public.japanese_grammar_guides(id) on delete cascade,
  supplementary_unit_id uuid not null references public.supplementary_units(id) on delete cascade,
  relationship text not null check(relationship in ('exact','strong','related')),
  note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(grammar_id,supplementary_unit_id)
);

create index if not exists supplementary_parts_resource_idx on public.supplementary_resource_parts(resource_id,sort_order);
create index if not exists supplementary_units_resource_idx on public.supplementary_units(resource_id,sort_order);
create index if not exists grammar_supplementary_links_user_grammar_idx on public.grammar_supplementary_links(user_id,grammar_id);

alter table public.supplementary_resources enable row level security;
alter table public.supplementary_resource_parts enable row level security;
alter table public.supplementary_units enable row level security;
alter table public.grammar_supplementary_links enable row level security;

drop policy if exists "supplementary_resources_select_own" on public.supplementary_resources;
create policy "supplementary_resources_select_own" on public.supplementary_resources
  for select to authenticated using(user_id=auth.uid() and private.is_app_owner());

drop policy if exists "supplementary_parts_select_own" on public.supplementary_resource_parts;
create policy "supplementary_parts_select_own" on public.supplementary_resource_parts
  for select to authenticated using(exists(
    select 1 from public.supplementary_resources resource
    where resource.id=supplementary_resource_parts.resource_id and resource.user_id=auth.uid()
  ) and private.is_app_owner());

drop policy if exists "supplementary_units_select_own" on public.supplementary_units;
create policy "supplementary_units_select_own" on public.supplementary_units
  for select to authenticated using(exists(
    select 1 from public.supplementary_resources resource
    where resource.id=supplementary_units.resource_id and resource.user_id=auth.uid()
  ) and private.is_app_owner());

drop policy if exists "grammar_supplementary_links_select_own" on public.grammar_supplementary_links;
create policy "grammar_supplementary_links_select_own" on public.grammar_supplementary_links
  for select to authenticated using(user_id=auth.uid() and private.is_app_owner());

revoke all on public.supplementary_resources,public.supplementary_resource_parts,public.supplementary_units,public.grammar_supplementary_links from anon,authenticated;
grant select on public.supplementary_resources,public.supplementary_resource_parts,public.supplementary_units,public.grammar_supplementary_links to authenticated;

insert into public.supplementary_resources(user_id,slug,title,english_title,resource_type,description,private_resource,optional)
select owner.user_id,'multimedia-basic-grammar','マルチメディア日本語基本文法ワークブック',
  'Multimedia Exercises for Basic Japanese Grammar','grammar_workbook',
  'Standalone basic-grammar drills for optional targeted practice.',true,true
from private.app_owner owner
on conflict(user_id,slug) do update set
  title=excluded.title,english_title=excluded.english_title,resource_type=excluded.resource_type,
  description=excluded.description,private_resource=excluded.private_resource,optional=excluded.optional,updated_at=now();

with part(part_key,storage_path,source_pdf_start,source_pdf_end,sort_order) as (values
  ('part-01','supplementary/multimedia-basic-grammar/part-01.pdf',1,85,1),
  ('part-02','supplementary/multimedia-basic-grammar/part-02.pdf',86,164,2),
  ('part-03','supplementary/multimedia-basic-grammar/part-03.pdf',165,245,3),
  ('part-04','supplementary/multimedia-basic-grammar/part-04.pdf',246,336,4)
)
insert into public.supplementary_resource_parts(resource_id,part_key,storage_path,source_pdf_start,source_pdf_end,sort_order)
select resource.id,part.part_key,part.storage_path,part.source_pdf_start,part.source_pdf_end,part.sort_order
from public.supplementary_resources resource cross join part
where resource.slug='multimedia-basic-grammar'
on conflict(resource_id,part_key) do update set
  storage_path=excluded.storage_path,source_pdf_start=excluded.source_pdf_start,
  source_pdf_end=excluded.source_pdf_end,sort_order=excluded.sort_order;

with unit(unit_number,source_heading,printed_page,source_pdf_page,part_key,local_pdf_page,sort_order) as (values
    (1,'あげる／くれる／もらう',2,20,'part-01',20,1),
    (2,'（～て）あげる／くれる／もらう',6,24,'part-01',24,2),
    (3,'間（に）',12,30,'part-01',30,3),
    (4,'Unit 4',14,32,'part-01',32,4),
    (5,'（～て）ある',16,34,'part-01',34,5),
    (6,'Unit 6',19,37,'part-01',37,6),
    (7,'ば／ばよかった',22,40,'part-01',40,7),
    (8,'ばかり',25,43,'part-01',43,8),
    (9,'だけ',27,45,'part-01',45,9),
    (10,'～だけで（は）なく～（も）',30,48,'part-01',48,10),
    (11,'だろう',32,50,'part-01',50,11),
    (12,'Unit 12',34,52,'part-01',52,12),
    (13,'Unit 13',36,54,'part-01',54,13),
    (14,'Unit 14',38,56,'part-01',56,14),
    (15,'Unit 15',40,58,'part-01',58,15),
    (16,'が（but）',42,60,'part-01',60,16),
    (17,'Unit 17',44,62,'part-01',62,17),
    (18,'がる',47,65,'part-01',65,18),
    (19,'ごろ／くらい',49,67,'part-01',67,19),
    (20,'～はじめる／おわる',51,69,'part-01',69,20),
    (21,'はず',53,71,'part-01',71,21),
    (22,'ほど',56,74,'part-01',74,22),
    (23,'ほうがいい',58,76,'part-01',76,23),
    (24,'ほしい',60,78,'part-01',78,24),
    (25,'（～て）ほしい',62,80,'part-01',80,25),
    (26,'Unit 26',64,82,'part-01',82,26),
    (27,'行く／来る',66,84,'part-01',84,27),
    (28,'Intransitive/Transitive Verbs',68,86,'part-02',1,28),
    (29,'（～て）いる',72,90,'part-02',5,29),
    (30,'か（or）',74,92,'part-02',7,30),
    (31,'か／か（どうか）',76,94,'part-02',9,31),
    (32,'かもしれない',78,96,'part-02',11,32),
    (33,'Unit 33',80,98,'part-02',13,33),
    (34,'（～て）から',83,101,'part-02',16,34),
    (35,'から／まで／までに',85,103,'part-02',18,35),
    (36,'Unit 36',88,106,'part-02',21,36),
    (37,'かわりに',90,108,'part-02',23,37),
    (38,'Unit 38',92,110,'part-02',25,38),
    (39,'Unit 39',94,112,'part-02',27,39),
    (40,'こと（nominalizer）',97,115,'part-02',30,40),
    (41,'ことがある（there are times when ～）',100,118,'part-02',33,41),
    (42,'Unit 42',102,120,'part-02',35,42),
    (43,'Unit 43',104,122,'part-02',37,43),
    (44,'ことになる',106,124,'part-02',39,44),
    (45,'ことにする',108,126,'part-02',41,45),
    (46,'Unit 46',111,129,'part-02',44,46),
    (47,'（～て）くる／いく',113,131,'part-02',46,47),
    (48,'まだ／もう',115,133,'part-02',48,48),
    (49,'前に／あとで',118,136,'part-02',51,49),
    (50,'Unit 50',120,138,'part-02',53,50),
    (51,'～ましょう',123,141,'part-02',56,51),
    (52,'Unit 52',125,143,'part-02',58,52),
    (53,'も（too）',127,145,'part-02',60,53),
    (54,'も（even）',130,148,'part-02',63,54),
    (55,'Unit 55',132,150,'part-02',65,55),
    (56,'Unit 56',133,151,'part-02',66,56),
    (57,'ながら',136,154,'part-02',69,57),
    (58,'～ないで',138,156,'part-02',71,58),
    (59,'なければならない／なくてはいけない',140,158,'part-02',73,59),
    (60,'～なくなる',143,161,'part-02',76,60),
    (61,'Unit 61',145,163,'part-02',78,61),
    (62,'なら',147,165,'part-03',1,62),
    (63,'Unit 63',150,168,'part-03',4,63),
    (64,'Unit 64',152,170,'part-03',6,64),
    (65,'Unit 65',154,172,'part-03',8,65),
    (66,'Unit 66',156,174,'part-03',10,66),
    (67,'Unit 67',158,176,'part-03',12,67),
    (68,'にちがいない',160,178,'part-03',14,68),
    (69,'の（possessive）',162,180,'part-03',16,69),
    (70,'の（one）',164,182,'part-03',18,70),
    (71,'Unit 71',166,184,'part-03',20,71),
    (72,'の／のだ',168,186,'part-03',22,72),
    (73,'ので',171,189,'part-03',25,73),
    (74,'のに',173,191,'part-03',27,74),
    (75,'～のは～だ',176,194,'part-03',30,75),
    (76,'Unit 76',178,196,'part-03',32,76),
    (77,'Unit 77',180,198,'part-03',34,77),
    (78,'Unit 78',182,200,'part-03',36,78),
    (79,'（～て）おく',184,202,'part-03',38,79),
    (80,'お～になる／honorific verbs',186,204,'part-03',40,80),
    (81,'お～する／humble verbs',188,206,'part-03',42,81),
    (82,'られる（passive）',191,209,'part-03',45,82),
    (83,'られる（potential）',195,213,'part-03',49,83),
    (84,'らしい',198,216,'part-03',52,84),
    (85,'Relative Clause',201,219,'part-03',55,85),
    (86,'させる',204,222,'part-03',58,86),
    (87,'し',207,225,'part-03',61,87),
    (88,'しか',210,228,'part-03',64,88),
    (89,'（～て）しまう',212,230,'part-03',66,89),
    (90,'Unit 90',214,232,'part-03',68,90),
    (91,'そうだ（hearsay）',216,234,'part-03',70,91),
    (92,'そうだ（conjecture）',218,236,'part-03',72,92),
    (93,'それでは',220,238,'part-03',74,93),
    (94,'Unit 94',222,240,'part-03',76,94),
    (95,'～すぎる',224,242,'part-03',78,95),
    (96,'Unit 96',226,244,'part-03',80,96),
    (97,'する／なる',228,246,'part-04',1,97),
    (98,'たい',231,249,'part-04',4,98),
    (99,'ため（に）',234,252,'part-04',7,99),
    (100,'たら／たらどうですか',236,254,'part-04',9,100),
    (101,'Unit 101',239,257,'part-04',12,101),
    (102,'～て',241,259,'part-04',14,102),
    (103,'ても',244,262,'part-04',17,103),
    (104,'てもいい／てはいけない',247,265,'part-04',20,104),
    (105,'と（with）',250,268,'part-04',23,105),
    (106,'と（if/when）',252,270,'part-04',25,106),
    (107,'と（思う）',254,272,'part-04',27,107),
    (108,'と／や',256,274,'part-04',29,108),
    (109,'という',258,276,'part-04',31,109),
    (110,'とか',260,278,'part-04',33,110),
    (111,'時',262,280,'part-04',35,111),
    (112,'ところだ',264,282,'part-04',37,112),
    (113,'として',267,285,'part-04',40,113),
    (114,'つもり',269,287,'part-04',42,114),
    (115,'うちに',271,289,'part-04',44,115),
    (116,'～は～だ',273,291,'part-04',46,116),
    (117,'Unit 117',275,293,'part-04',48,117),
    (118,'～やすい／にくい',277,295,'part-04',50,118),
    (119,'Unit 119',279,297,'part-04',52,119),
    (120,'ようだ',281,299,'part-04',54,120),
    (121,'ように（like/as/as if）',283,301,'part-04',56,121),
    (122,'ように（so that）',286,304,'part-04',59,122),
    (123,'ように言う',288,306,'part-04',61,123),
    (124,'ようになる',290,308,'part-04',63,124),
    (125,'ようにする',292,310,'part-04',65,125),
    (126,'Unit 126',294,312,'part-04',67,126),
    (127,'～ようと思う',296,314,'part-04',69,127)
)
insert into public.supplementary_units(resource_id,unit_number,source_heading,printed_page,source_pdf_page,resource_part_id,local_pdf_page,sort_order)
select resource.id,unit.unit_number,unit.source_heading,unit.printed_page,unit.source_pdf_page,part.id,unit.local_pdf_page,unit.sort_order
from public.supplementary_resources resource
join unit on true
join public.supplementary_resource_parts part on part.resource_id=resource.id and part.part_key=unit.part_key
where resource.slug='multimedia-basic-grammar'
on conflict(resource_id,unit_number) do update set
  source_heading=excluded.source_heading,printed_page=excluded.printed_page,source_pdf_page=excluded.source_pdf_page,
  resource_part_id=excluded.resource_part_id,local_pdf_page=excluded.local_pdf_page,sort_order=excluded.sort_order,updated_at=now();

-- These mappings come from the attached live Grammar Library export. Both slug
-- and normalized canonical pattern must agree, preventing a stale slug from
-- linking the workbook to the wrong guide. Related and ambiguous candidates are
-- intentionally not seeded in this first pass.
with mapping(guide_slug,canonical,unit_number,relationship,note) as (values
    ('grammar-64604f163b45d3bb4160','〜かもしれない',32,'exact','Direct practice match.'),
    ('garu','〜がる',18,'exact','Direct practice match.'),
    ('ku-naru','〜くなる',97,'strong','The workbook practises change of state through する／なる; keep the canonical guide specific.'),
    ('kurai-approximation','〜くらい',19,'exact','Direct approximation practice.'),
    ('koto-ni-suru','〜ことにする',45,'exact','Direct practice match.'),
    ('koto-ni-naru','〜ことになる',44,'exact','Direct practice match.'),
    ('goro','〜ごろ',19,'exact','Direct time-approximation practice.'),
    ('te-shimau','〜しまう',89,'exact','Direct practice of the 〜てしまう family.'),
    ('tai','〜たい',98,'exact','Direct practice match.'),
    ('tara','〜たら',100,'exact','Direct conditional practice.'),
    ('darou','〜だろう',11,'exact','Direct modal practice.'),
    ('tsumori','〜つもり',114,'exact','Direct practice match.'),
    ('te-aru','〜てある',5,'exact','Direct practice match.'),
    ('te-iku','〜ていく',47,'exact','Direct practice of 〜ていく.'),
    ('te-iru','〜ている',29,'exact','Direct aspect and resulting-state practice.'),
    ('te-oku','〜ておく',79,'exact','Direct practice match.'),
    ('te-kuru','〜てくる',47,'exact','Direct practice of 〜てくる.'),
    ('grammar-1f5f5a58e368468796a3','〜てくれる',2,'exact','Direct benefactive practice.'),
    ('te-morau','〜てもらう',2,'exact','Direct benefactive practice.'),
    ('te-hoshii','〜て欲しい',25,'exact','Direct practice match.'),
    ('to-omou-opinion','〜と思う',107,'exact','Direct quotation and thought practice.'),
    ('naku-naru','〜なくなる',60,'exact','Direct practice match.'),
    ('nara','〜なら',62,'exact','Direct conditional practice.'),
    ('ni-suru','〜にする',97,'strong','The workbook practises choice/change through する／なる.'),
    ('ni-naru','〜になる',97,'strong','The workbook practises change of state through する／なる.'),
    ('ba','〜ば',7,'exact','Direct conditional practice.'),
    ('hazu','〜はず',21,'exact','Direct practice match.'),
    ('hodo','〜ほど',22,'exact','Direct practice match.'),
    ('grammar-3f87a258a2036e3c9e6b','〜ようだ',120,'exact','Direct ようだ practice; use only for the matching guide sense.'),
    ('you-to-omou','〜ようと思う',127,'exact','Direct volitional-intention practice.'),
    ('you-ni-suru','〜ようにする',125,'exact','Direct practice match.'),
    ('you-ni-naru','〜ようになる',124,'exact','Direct practice match.'),
    ('rashii-conjecture','〜らしい',84,'exact','Direct form match for the conjecture/hearsay guide sense.'),
    ('hajimeru','〜始める',20,'exact','Direct aspectual practice.'),
    ('owaru','〜終わる',20,'exact','Direct aspectual practice.'),
    ('kuru','来る',27,'exact','Direct motion-verb practice.'),
    ('hoshii','欲しい',24,'exact','Direct desire practice.'),
    ('iku','行く',27,'exact','Direct motion-verb practice.')
)
insert into public.grammar_supplementary_links(user_id,grammar_id,supplementary_unit_id,relationship,note)
select guide.user_id,guide.id,unit.id,mapping.relationship,mapping.note
from mapping
join public.japanese_grammar_guides guide
  on guide.slug=mapping.guide_slug
 and guide.pattern_key=public.repository_grammar_key(mapping.canonical)
join public.supplementary_resources resource
  on resource.user_id=guide.user_id and resource.slug='multimedia-basic-grammar'
join public.supplementary_units unit
  on unit.resource_id=resource.id and unit.unit_number=mapping.unit_number
on conflict(grammar_id,supplementary_unit_id) do update set
  relationship=excluded.relationship,note=excluded.note,updated_at=now();

commit;
