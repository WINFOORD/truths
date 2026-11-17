-- Non-destructive migration: keeps all existing data.
-- Adds per-guest feature access, This-or-That, date planning, timed messages and personal page content.
-- Run once in the Supabase SQL Editor (safe to run again).

begin;

alter table public.guests
  add column if not exists features jsonb not null default '{"page":true,"game":true,"tot":true,"date":false}'::jsonb,
  add column if not exists fal text not null default '',
  add column if not exists page_cards text not null default '';

-- Yasna gets access to the date section; everyone else keeps it off until you enable it.
update public.guests set features = features || '{"date":true}'::jsonb where name = 'یسنا';

create table if not exists public.tot_prompts (
  id uuid primary key default gen_random_uuid(),
  category text not null default '',
  option_a text not null,
  option_b text not null,
  host_pick smallint check (host_pick in (0, 1)),
  guest_id uuid references public.guests(id) on delete cascade, -- null = for everyone
  created_at timestamptz not null default now()
);

create table if not exists public.tot_answers (
  prompt_id uuid not null references public.tot_prompts(id) on delete cascade,
  guest_id uuid not null references public.guests(id) on delete cascade,
  pick smallint not null check (pick in (0, 1)),
  created_at timestamptz not null default now(),
  primary key (prompt_id, guest_id)
);

create table if not exists public.timed_messages (
  id uuid primary key default gen_random_uuid(),
  guest_id uuid not null references public.guests(id) on delete cascade,
  body text not null,
  unlock_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists public.date_places (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  note text not null default '',
  lat double precision not null,
  lng double precision not null,
  created_at timestamptz not null default now()
);

create table if not exists public.date_plans (
  id uuid primary key default gen_random_uuid(),
  guest_id uuid not null references public.guests(id) on delete cascade,
  place_id uuid references public.date_places(id) on delete set null,
  place_name text not null,
  when_text text not null default '',
  status text not null default 'requested' check (status in ('requested', 'confirmed', 'done', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tot_prompts_guest_idx on public.tot_prompts(guest_id, created_at desc);
create index if not exists timed_guest_idx on public.timed_messages(guest_id, unlock_at);
create index if not exists date_plans_guest_idx on public.date_plans(guest_id, created_at desc);

-- Browser never touches these tables directly; only the serverless API (service role) does.
alter table public.tot_prompts enable row level security;
alter table public.tot_answers enable row level security;
alter table public.timed_messages enable row level security;
alter table public.date_places enable row level security;
alter table public.date_plans enable row level security;

revoke all on table public.tot_prompts, public.tot_answers, public.timed_messages, public.date_places, public.date_plans
  from anon, authenticated;
grant all on table public.tot_prompts, public.tot_answers, public.timed_messages, public.date_places, public.date_plans
  to service_role;

commit;
