-- Run once in Supabase Dashboard > SQL Editor.
-- Makes every account discoverable by username/display name and keeps search fast.

create extension if not exists pg_trgm;

alter table public.profiles enable row level security;
drop policy if exists "Profiles are publicly readable" on public.profiles;
create policy "Profiles are publicly readable"
on public.profiles for select
using (true);

create unique index if not exists profiles_username_lower_unique
on public.profiles (lower(username));

create index if not exists profiles_username_search_idx
on public.profiles using gin (lower(username) gin_trgm_ops);

create index if not exists profiles_display_name_search_idx
on public.profiles using gin (lower(coalesce(display_name, '')) gin_trgm_ops);
