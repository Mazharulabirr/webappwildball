-- Run once in Supabase Dashboard > SQL Editor.
-- GameDay Hub MVP: athletes or team managers can manage a player's schedule,
-- results, and post-game stat line.

create table if not exists public.games (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.profiles(id) on delete cascade,
  opponent_name text not null check (char_length(trim(opponent_name)) between 2 and 120),
  scheduled_at timestamptz not null,
  venue text not null default '' check (char_length(venue) <= 160),
  is_home boolean not null default true,
  status text not null default 'scheduled' check (status in ('scheduled', 'final')),
  athlete_score integer check (athlete_score >= 0),
  opponent_score integer check (opponent_score >= 0),
  notes text not null default '' check (char_length(notes) <= 600),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((status = 'scheduled' and athlete_score is null and opponent_score is null) or (status = 'final' and athlete_score is not null and opponent_score is not null))
);

create index if not exists games_athlete_schedule_idx on public.games (athlete_id, scheduled_at desc);

create table if not exists public.game_player_stats (
  game_id uuid primary key references public.games(id) on delete cascade,
  athlete_id uuid not null references public.profiles(id) on delete cascade,
  points integer not null default 0 check (points >= 0),
  rebounds integer not null default 0 check (rebounds >= 0),
  assists integer not null default 0 check (assists >= 0),
  steals integer not null default 0 check (steals >= 0),
  blocks integer not null default 0 check (blocks >= 0),
  updated_at timestamptz not null default now()
);

alter table public.games enable row level security;
alter table public.game_player_stats enable row level security;

create policy "Games are publicly readable" on public.games for select using (true);
create policy "Players manage their own games" on public.games for insert with check ((select auth.uid()) = athlete_id);
create policy "Players update their own games" on public.games for update using ((select auth.uid()) = athlete_id) with check ((select auth.uid()) = athlete_id);
create policy "Players delete their own games" on public.games for delete using ((select auth.uid()) = athlete_id);

create policy "Game stats are publicly readable" on public.game_player_stats for select using (true);
create policy "Players manage their own game stats" on public.game_player_stats for insert with check ((select auth.uid()) = athlete_id);
create policy "Players update their own game stats" on public.game_player_stats for update using ((select auth.uid()) = athlete_id) with check ((select auth.uid()) = athlete_id);
create policy "Players delete their own game stats" on public.game_player_stats for delete using ((select auth.uid()) = athlete_id);
