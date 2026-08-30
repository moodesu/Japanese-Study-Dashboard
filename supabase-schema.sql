-- TOBIRA Japanese Study Dashboard
-- Run this entire script in Supabase SQL Editor.
-- This schema is designed for a single private user, but still uses user_id
-- and Row Level Security so the data remains isolated to the logged-in account.

create extension if not exists pgcrypto;

create table if not exists public.task_state (
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id text not null,
  completed boolean not null default false,
  completed_at timestamptz,
  mastery text not null default 'not_started'
    check (mastery in ('not_started','studying','shaky','mastered','review')),
  confidence smallint check (confidence between 1 and 5),
  notes text not null default '',
  updated_at timestamptz not null default now(),
  primary key (user_id, task_id)
);

create table if not exists public.app_notes (
  user_id uuid primary key references auth.users(id) on delete cascade,
  notes text not null default '',
  updated_at timestamptz not null default now()
);

create table if not exists public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  start_date date,
  settings jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.pomodoro_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id text,
  lesson smallint check (lesson between 1 and 99),
  duration_seconds integer not null check (duration_seconds > 0),
  started_at timestamptz not null,
  completed_at timestamptz not null,
  created_at timestamptz not null default now()
);

alter table public.task_state enable row level security;
alter table public.app_notes enable row level security;
alter table public.user_preferences enable row level security;
alter table public.pomodoro_sessions enable row level security;

drop policy if exists "task_state_select_own" on public.task_state;
drop policy if exists "task_state_insert_own" on public.task_state;
drop policy if exists "task_state_update_own" on public.task_state;
drop policy if exists "task_state_delete_own" on public.task_state;
create policy "task_state_select_own" on public.task_state for select using (auth.uid() = user_id);
create policy "task_state_insert_own" on public.task_state for insert with check (auth.uid() = user_id);
create policy "task_state_update_own" on public.task_state for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "task_state_delete_own" on public.task_state for delete using (auth.uid() = user_id);

drop policy if exists "app_notes_select_own" on public.app_notes;
drop policy if exists "app_notes_insert_own" on public.app_notes;
drop policy if exists "app_notes_update_own" on public.app_notes;
drop policy if exists "app_notes_delete_own" on public.app_notes;
create policy "app_notes_select_own" on public.app_notes for select using (auth.uid() = user_id);
create policy "app_notes_insert_own" on public.app_notes for insert with check (auth.uid() = user_id);
create policy "app_notes_update_own" on public.app_notes for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "app_notes_delete_own" on public.app_notes for delete using (auth.uid() = user_id);

drop policy if exists "preferences_select_own" on public.user_preferences;
drop policy if exists "preferences_insert_own" on public.user_preferences;
drop policy if exists "preferences_update_own" on public.user_preferences;
drop policy if exists "preferences_delete_own" on public.user_preferences;
create policy "preferences_select_own" on public.user_preferences for select using (auth.uid() = user_id);
create policy "preferences_insert_own" on public.user_preferences for insert with check (auth.uid() = user_id);
create policy "preferences_update_own" on public.user_preferences for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "preferences_delete_own" on public.user_preferences for delete using (auth.uid() = user_id);

drop policy if exists "pomodoro_sessions_select_own" on public.pomodoro_sessions;
drop policy if exists "pomodoro_sessions_insert_own" on public.pomodoro_sessions;
drop policy if exists "pomodoro_sessions_update_own" on public.pomodoro_sessions;
drop policy if exists "pomodoro_sessions_delete_own" on public.pomodoro_sessions;
create policy "pomodoro_sessions_select_own" on public.pomodoro_sessions for select using (auth.uid() = user_id);
create policy "pomodoro_sessions_insert_own" on public.pomodoro_sessions for insert with check (auth.uid() = user_id);
create policy "pomodoro_sessions_update_own" on public.pomodoro_sessions for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "pomodoro_sessions_delete_own" on public.pomodoro_sessions for delete using (auth.uid() = user_id);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists task_state_updated_at on public.task_state;
create trigger task_state_updated_at before update on public.task_state
for each row execute function public.set_updated_at();

drop trigger if exists app_notes_updated_at on public.app_notes;
create trigger app_notes_updated_at before update on public.app_notes
for each row execute function public.set_updated_at();

drop trigger if exists preferences_updated_at on public.user_preferences;
create trigger preferences_updated_at before update on public.user_preferences
for each row execute function public.set_updated_at();

-- Optional: prevent anonymous access explicitly.
revoke all on public.task_state from anon;
revoke all on public.app_notes from anon;
revoke all on public.user_preferences from anon;
revoke all on public.pomodoro_sessions from anon;
grant select, insert, update, delete on public.task_state to authenticated;
grant select, insert, update, delete on public.app_notes to authenticated;
grant select, insert, update, delete on public.user_preferences to authenticated;
grant select, insert, update, delete on public.pomodoro_sessions to authenticated;

-- Private lesson audio. Run this section once, then upload the extracted
-- publisher folders L11-13, L14-16, L17-20 and reading_L11-20 into this bucket.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('lesson-audio', 'lesson-audio', false, 15728640, array['audio/mpeg'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "lesson_audio_select_authenticated" on storage.objects;
drop policy if exists "lesson_audio_insert_authenticated" on storage.objects;
drop policy if exists "lesson_audio_update_authenticated" on storage.objects;
drop policy if exists "lesson_audio_delete_authenticated" on storage.objects;
drop policy if exists "lesson_audio_select_owner" on storage.objects;

-- Record the owner automatically only when this project currently has exactly
-- one Auth user. Dashboard/service-role uploads continue to bypass this policy.
create schema if not exists private;
create table if not exists private.app_owner (
  user_id uuid primary key references auth.users(id) on delete cascade
);
alter table private.app_owner enable row level security;
revoke all on schema private from public, anon, authenticated;
revoke all on private.app_owner from public, anon, authenticated;

insert into private.app_owner (user_id)
select id from auth.users
where (select count(*) from auth.users) = 1
on conflict (user_id) do nothing;

create or replace function private.is_app_owner()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from private.app_owner where user_id = auth.uid()
  );
$$;
revoke all on function private.is_app_owner() from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.is_app_owner() to authenticated;

create policy "lesson_audio_select_owner"
on storage.objects for select to authenticated
using (bucket_id = 'lesson-audio' and private.is_app_owner());

-- Private publisher-video mapping. Keep protected/unlisted YouTube URLs out of
-- the public frontend source. Import rows through the Supabase Table Editor
-- using lesson-videos-import-template.csv; the browser receives read-only
-- access after the sole app owner has authenticated.
create table if not exists public.lesson_videos (
  id bigint generated by default as identity primary key,
  lesson smallint not null check (lesson between 11 and 20),
  video_type text not null
    check (video_type in ('vocabulary','grammar','dialogue')),
  grammar_index smallint check (grammar_index between 1 and 20),
  title text not null check (length(trim(title)) > 0),
  youtube_url text not null
    check (youtube_url ~* '^https://(www\.)?(youtube\.com|youtu\.be)/'),
  sort_order smallint not null default 1 check (sort_order > 0),
  created_at timestamptz not null default now(),
  constraint lesson_videos_type_grammar_index_check check (
    (video_type = 'grammar' and grammar_index is not null)
    or (video_type <> 'grammar' and grammar_index is null)
  ),
  unique (lesson, video_type, sort_order)
);

alter table public.lesson_videos enable row level security;

drop policy if exists "lesson_videos_select_owner" on public.lesson_videos;
create policy "lesson_videos_select_owner"
on public.lesson_videos for select to authenticated
using (private.is_app_owner());

revoke all on public.lesson_videos from anon, authenticated;
grant select on public.lesson_videos to authenticated;
