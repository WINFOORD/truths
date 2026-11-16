-- Safe, non-destructive migration for the current Two Truths project.
-- Keeps all existing guests, questions, answers and messages.

begin;

alter table public.guests
  add column if not exists theme text not null default '',
  add column if not exists notes text not null default '',
  add column if not exists chat_id bigint,
  add column if not exists tg_username text,
  add column if not exists invite_token text;

alter table public.questions
  add column if not exists notified boolean not null default false;

alter table public.answers
  add column if not exists reported boolean not null default false;

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  guest_id uuid references public.guests(id) on delete cascade,
  body text not null,
  notified boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.messages
  add column if not exists notified boolean not null default false;

-- Give existing guests a private, hard-to-guess invitation URL.
update public.guests
set invite_token = replace(gen_random_uuid()::text, '-', '')
where invite_token is null or invite_token = '';

alter table public.guests alter column invite_token set not null;

create unique index if not exists guests_invite_token_uidx
  on public.guests(invite_token);

create index if not exists questions_guest_created_idx
  on public.questions(guest_id, created_at desc);
create index if not exists answers_question_idx
  on public.answers(question_id);
create index if not exists messages_guest_created_idx
  on public.messages(guest_id, created_at desc);

-- The browser no longer accesses Supabase directly. All database requests go
-- through authenticated serverless functions using the service-role key.
-- Remove old permissive policies without dropping or rewriting any data.
do $$
declare p record;
begin
  for p in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in ('guests', 'questions', 'answers', 'messages')
  loop
    execute format('drop policy if exists %I on %I.%I', p.policyname, p.schemaname, p.tablename);
  end loop;
end $$;

alter table public.guests enable row level security;
alter table public.questions enable row level security;
alter table public.answers enable row level security;
alter table public.messages enable row level security;

revoke all on table public.guests, public.questions, public.answers, public.messages
  from anon, authenticated;

-- Disable any legacy public date-of-birth login RPC if it exists.
do $$
declare f record;
begin
  for f in
    select p.oid::regprocedure as signature
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'guest_login'
  loop
    execute format('revoke all on function %s from public, anon, authenticated', f.signature);
  end loop;
end $$;

grant all on table public.guests, public.questions, public.answers, public.messages
  to service_role;

commit;
