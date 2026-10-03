-- Run this once in Supabase Dashboard > SQL Editor.
-- This is the initial Wildball social schema and its Row Level Security rules.

create extension if not exists "pgcrypto";

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null check (username ~ '^[a-z0-9._]{3,30}$'),
  display_name text,
  bio text default '',
  avatar_path text,
  location text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  caption text not null default '' check (char_length(caption) <= 2200),
  video_path text not null,
  poster_path text,
  status text not null default 'published' check (status in ('draft', 'published')),
  created_at timestamptz not null default now()
);
create index posts_feed_idx on public.posts (status, created_at desc);
create index posts_author_idx on public.posts (author_id, created_at desc);

create table public.follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);
create index follows_following_idx on public.follows (following_id);

create table public.post_likes (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
create index post_likes_post_idx on public.post_likes (post_id);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 1000),
  created_at timestamptz not null default now()
);
create index comments_post_idx on public.comments (post_id, created_at asc);

alter table public.profiles enable row level security;
alter table public.posts enable row level security;
alter table public.follows enable row level security;
alter table public.post_likes enable row level security;
alter table public.comments enable row level security;

create policy "Profiles are publicly readable" on public.profiles for select using (true);
create policy "Users create their own profile" on public.profiles for insert with check ((select auth.uid()) = id);
create policy "Users update their own profile" on public.profiles for update using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create policy "Published posts are publicly readable" on public.posts for select using (status = 'published' or (select auth.uid()) = author_id);
create policy "Users create their own posts" on public.posts for insert with check ((select auth.uid()) = author_id);
create policy "Users update their own posts" on public.posts for update using ((select auth.uid()) = author_id) with check ((select auth.uid()) = author_id);
create policy "Users delete their own posts" on public.posts for delete using ((select auth.uid()) = author_id);

create policy "Follows are publicly readable" on public.follows for select using (true);
create policy "Users manage their own follows" on public.follows for insert with check ((select auth.uid()) = follower_id);
create policy "Users remove their own follows" on public.follows for delete using ((select auth.uid()) = follower_id);

create policy "Likes are publicly readable" on public.post_likes for select using (true);
create policy "Users create their own likes" on public.post_likes for insert with check ((select auth.uid()) = user_id);
create policy "Users remove their own likes" on public.post_likes for delete using ((select auth.uid()) = user_id);

create policy "Comments are publicly readable" on public.comments for select using (true);
create policy "Users create their own comments" on public.comments for insert with check ((select auth.uid()) = author_id);
create policy "Users update their own comments" on public.comments for update using ((select auth.uid()) = author_id) with check ((select auth.uid()) = author_id);
create policy "Users delete their own comments" on public.comments for delete using ((select auth.uid()) = author_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('videos', 'videos', true, 524288000, array['video/mp4', 'video/webm', 'video/quicktime'])
on conflict (id) do nothing;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "Public video reads" on storage.objects for select using (bucket_id = 'videos');
create policy "Users upload their own videos" on storage.objects for insert to authenticated with check (bucket_id = 'videos' and (storage.foldername(name))[1] = (select auth.uid()::text));
create policy "Users update their own videos" on storage.objects for update to authenticated using (bucket_id = 'videos' and owner_id = (select auth.uid()::text));
create policy "Users delete their own videos" on storage.objects for delete to authenticated using (bucket_id = 'videos' and owner_id = (select auth.uid()::text));

create policy "Public avatar reads" on storage.objects for select using (bucket_id = 'avatars');
create policy "Users upload their own avatar" on storage.objects for insert to authenticated with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid()::text));
create policy "Users update their own avatar" on storage.objects for update to authenticated using (bucket_id = 'avatars' and owner_id = (select auth.uid()::text));
create policy "Users delete their own avatar" on storage.objects for delete to authenticated using (bucket_id = 'avatars' and owner_id = (select auth.uid()::text));
