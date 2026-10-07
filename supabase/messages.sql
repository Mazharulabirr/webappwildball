-- Run this once in Supabase Dashboard > SQL Editor to enable Wildball Inbox.
create extension if not exists "pgcrypto";

create table if not exists public.direct_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 1000),
  created_at timestamptz not null default now(),
  read_at timestamptz,
  check (sender_id <> recipient_id)
);

create index if not exists direct_messages_sender_idx on public.direct_messages (sender_id, created_at asc);
create index if not exists direct_messages_recipient_idx on public.direct_messages (recipient_id, created_at asc);
alter table public.direct_messages enable row level security;

drop policy if exists "Users read their own direct messages" on public.direct_messages;
drop policy if exists "Users send direct messages" on public.direct_messages;
drop policy if exists "Recipients mark direct messages as read" on public.direct_messages;

create policy "Users read their own direct messages" on public.direct_messages
  for select using ((select auth.uid()) = sender_id or (select auth.uid()) = recipient_id);
create policy "Users send direct messages" on public.direct_messages
  for insert with check ((select auth.uid()) = sender_id and sender_id <> recipient_id);
create policy "Recipients mark direct messages as read" on public.direct_messages
  for update using ((select auth.uid()) = recipient_id) with check ((select auth.uid()) = recipient_id);
