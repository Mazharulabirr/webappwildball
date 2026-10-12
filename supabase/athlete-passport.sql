-- Run once in Supabase Dashboard > SQL Editor.
-- Stores the Athlete Passport shown on every public player profile.

create table if not exists public.athlete_passports (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  sport text not null default 'Basketball' check (char_length(sport) <= 60),
  position text default '' check (char_length(position) <= 80),
  team_name text default '' check (char_length(team_name) <= 120),
  jersey_number text default '' check (char_length(jersey_number) <= 12),
  season_games integer not null default 0 check (season_games >= 0),
  season_points integer not null default 0 check (season_points >= 0),
  season_rebounds integer not null default 0 check (season_rebounds >= 0),
  season_assists integer not null default 0 check (season_assists >= 0),
  achievements text[] not null default '{}',
  awards text[] not null default '{}',
  career_history text[] not null default '{}',
  updated_at timestamptz not null default now()
);

-- Safe upgrades if the initial Passport table was already created.
alter table public.athlete_passports add column if not exists height text default '' check (char_length(height) <= 30);
alter table public.athlete_passports add column if not exists dominant_hand text default '' check (char_length(dominant_hand) <= 30);
alter table public.athlete_passports add column if not exists age_group text default '' check (char_length(age_group) <= 60);
alter table public.athlete_passports add column if not exists play_style text default '' check (char_length(play_style) <= 100);

alter table public.athlete_passports enable row level security;

create policy "Athlete Passports are publicly readable"
on public.athlete_passports for select using (true);

create policy "Players create their own Athlete Passport"
on public.athlete_passports for insert
with check ((select auth.uid()) = profile_id);

create policy "Players update their own Athlete Passport"
on public.athlete_passports for update
using ((select auth.uid()) = profile_id)
with check ((select auth.uid()) = profile_id);

-- Give every existing player a complete, editable starter Passport.
-- These are demo values; each athlete can replace them from /passport.
insert into public.athlete_passports (
  profile_id, sport, position, team_name, jersey_number, height, dominant_hand, age_group, play_style,
  season_games, season_points, season_rebounds, season_assists,
  achievements, awards, career_history
)
select
  id,
  'Basketball',
  (array['Point Guard', 'Shooting Guard', 'Small Forward', 'Power Forward', 'Center'])[((row_number() over (order by created_at)::int - 1) % 5) + 1],
  'Wildball Community',
  ((row_number() over (order by created_at)::int + 3)::text),
  '6''1"',
  'Right handed',
  'Open division',
  'Two-way playmaker',
  18 + ((row_number() over (order by created_at)::int - 1) % 8),
  184 + ((row_number() over (order by created_at)::int - 1) * 17),
  52 + ((row_number() over (order by created_at)::int - 1) * 5),
  31 + ((row_number() over (order by created_at)::int - 1) * 4),
  array['Active Wildball athlete', 'Season highlight creator'],
  array['Wildball Community player'],
  array['2026 · Wildball Community', '2025 · Local basketball circuit']
from public.profiles
on conflict (profile_id) do nothing;

-- Complete the new optional snapshot fields for Passport rows created earlier.
update public.athlete_passports
set
  height = coalesce(nullif(height, ''), '6''1"'),
  dominant_hand = coalesce(nullif(dominant_hand, ''), 'Right handed'),
  age_group = coalesce(nullif(age_group, ''), 'Open division'),
  play_style = coalesce(nullif(play_style, ''), 'Two-way playmaker')
where height = '' or dominant_hand = '' or age_group = '' or play_style = '';
