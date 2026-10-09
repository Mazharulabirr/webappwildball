-- Run once in Supabase Dashboard > SQL Editor.
-- Atomic, server-authoritative Wildball Credits ledger.
-- Real payouts must remain disabled until a licensed payout provider and KYC flow are configured.

create table if not exists public.credit_program_settings (
  id boolean primary key default true check (id),
  currency text not null default 'BDT',
  minor_units_per_credit integer not null default 100 check (minor_units_per_credit > 0),
  minimum_redemption_credits bigint not null default 1000 check (minimum_redemption_credits > 0),
  redemptions_enabled boolean not null default false,
  updated_at timestamptz not null default now()
);
insert into public.credit_program_settings (id) values (true) on conflict (id) do nothing;

create table if not exists public.credit_wallets (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  available_credits bigint not null default 0 check (available_credits >= 0),
  reserved_credits bigint not null default 0 check (reserved_credits >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.credit_transfers (
  id uuid primary key default gen_random_uuid(),
  request_id uuid unique not null,
  sender_id uuid not null references public.profiles(id),
  recipient_id uuid not null references public.profiles(id),
  amount_credits bigint not null check (amount_credits > 0),
  status text not null default 'completed' check (status in ('completed','reversed')),
  created_at timestamptz not null default now(),
  check (sender_id <> recipient_id)
);

create table if not exists public.credit_redemptions (
  id uuid primary key default gen_random_uuid(),
  request_id uuid unique not null,
  profile_id uuid not null references public.profiles(id),
  amount_credits bigint not null check (amount_credits > 0),
  currency text not null,
  cash_amount_minor bigint not null check (cash_amount_minor > 0),
  status text not null default 'pending' check (status in ('pending','approved','paid','rejected','cancelled')),
  provider_reference text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists credit_transfers_sender_idx on public.credit_transfers(sender_id, created_at desc);
create index if not exists credit_transfers_recipient_idx on public.credit_transfers(recipient_id, created_at desc);
create index if not exists credit_redemptions_profile_idx on public.credit_redemptions(profile_id, created_at desc);

alter table public.credit_program_settings enable row level security;
alter table public.credit_wallets enable row level security;
alter table public.credit_transfers enable row level security;
alter table public.credit_redemptions enable row level security;

drop policy if exists "Credit program settings are readable" on public.credit_program_settings;
create policy "Credit program settings are readable" on public.credit_program_settings for select using (true);
drop policy if exists "Users view own wallet" on public.credit_wallets;
create policy "Users view own wallet" on public.credit_wallets for select using ((select auth.uid()) = profile_id);
drop policy if exists "Participants view transfers" on public.credit_transfers;
create policy "Participants view transfers" on public.credit_transfers for select using ((select auth.uid()) in (sender_id, recipient_id));
drop policy if exists "Users view own redemptions" on public.credit_redemptions;
create policy "Users view own redemptions" on public.credit_redemptions for select using ((select auth.uid()) = profile_id);

create or replace function public.send_credits(receiver_id uuid, credits bigint, client_request_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare sender uuid := auth.uid(); transfer_id uuid; sender_balance bigint;
begin
  if sender is null then raise exception 'Authentication required'; end if;
  if sender = receiver_id then raise exception 'You cannot send credits to yourself'; end if;
  if credits not in (50,100,250,500,1000) then raise exception 'Invalid credit amount'; end if;
  if not exists(select 1 from profiles where id=receiver_id) then raise exception 'Recipient not found'; end if;
  select id into transfer_id from credit_transfers where request_id=client_request_id and sender_id=sender;
  if transfer_id is not null then return transfer_id; end if;
  insert into credit_wallets(profile_id) values(sender),(receiver_id) on conflict(profile_id) do nothing;
  perform 1 from credit_wallets where profile_id in(sender,receiver_id) order by profile_id for update;
  select available_credits into sender_balance from credit_wallets where profile_id=sender;
  if sender_balance < credits then raise exception 'Insufficient credits'; end if;
  update credit_wallets set available_credits=available_credits-credits,updated_at=now() where profile_id=sender;
  update credit_wallets set available_credits=available_credits+credits,updated_at=now() where profile_id=receiver_id;
  insert into credit_transfers(request_id,sender_id,recipient_id,amount_credits) values(client_request_id,sender,receiver_id,credits) returning id into transfer_id;
  return transfer_id;
end $$;

create or replace function public.request_credit_redemption(credits bigint, client_request_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare account_id uuid := auth.uid(); redemption_id uuid; balance bigint; program credit_program_settings%rowtype;
begin
  if account_id is null then raise exception 'Authentication required'; end if;
  select * into program from credit_program_settings where id=true;
  if not program.redemptions_enabled then raise exception 'Redemptions are not enabled yet'; end if;
  if credits < program.minimum_redemption_credits then raise exception 'Amount is below the redemption minimum'; end if;
  select id into redemption_id from credit_redemptions where request_id=client_request_id and profile_id=account_id;
  if redemption_id is not null then return redemption_id; end if;
  insert into credit_wallets(profile_id) values(account_id) on conflict(profile_id) do nothing;
  select available_credits into balance from credit_wallets where profile_id=account_id for update;
  if balance < credits then raise exception 'Insufficient credits'; end if;
  update credit_wallets set available_credits=available_credits-credits,reserved_credits=reserved_credits+credits,updated_at=now() where profile_id=account_id;
  insert into credit_redemptions(request_id,profile_id,amount_credits,currency,cash_amount_minor)
  values(client_request_id,account_id,credits,program.currency,credits*program.minor_units_per_credit) returning id into redemption_id;
  return redemption_id;
end $$;

revoke all on function public.send_credits(uuid,bigint,uuid) from public;
revoke all on function public.request_credit_redemption(bigint,uuid) from public;
grant execute on function public.send_credits(uuid,bigint,uuid) to authenticated;
grant execute on function public.request_credit_redemption(bigint,uuid) to authenticated;
