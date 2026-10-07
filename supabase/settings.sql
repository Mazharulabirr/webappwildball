-- Run once in Supabase Dashboard > SQL Editor to persist Wildball settings.
create table if not exists public.user_settings (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  private_account boolean not null default false,
  desktop_notifications boolean not null default true,
  weekly_updates boolean not null default false,
  high_contrast boolean not null default false,
  comments_audience text not null default 'everyone' check (comments_audience in ('everyone', 'followers', 'no_one')),
  region text not null default 'Bangladesh',
  screen_time_minutes integer not null default 0 check (screen_time_minutes in (0, 30, 60, 120, 180)),
  sleep_hours text not null default 'off',
  filtered_keywords text[] not null default '{}',
  updated_at timestamptz not null default now()
);

-- Enforce the private-account preference on published video reads.
alter table public.profiles add column if not exists is_private boolean not null default false;
drop policy if exists "Published posts are publicly readable" on public.posts;
create policy "Published posts are publicly readable" on public.posts for select using (
  (select auth.uid()) = author_id
  or (
    status = 'published'
    and (
      not coalesce((select is_private from public.profiles where id = author_id), false)
      or exists (select 1 from public.follows where follower_id = (select auth.uid()) and following_id = author_id)
    )
  )
);

alter table public.user_settings enable row level security;
drop policy if exists "Users read their own settings" on public.user_settings;
drop policy if exists "Users create their own settings" on public.user_settings;
drop policy if exists "Users update their own settings" on public.user_settings;
create policy "Users read their own settings" on public.user_settings for select using ((select auth.uid()) = user_id);
create policy "Users create their own settings" on public.user_settings for insert with check ((select auth.uid()) = user_id);
create policy "Users update their own settings" on public.user_settings for update using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
