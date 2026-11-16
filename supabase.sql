-- ⚠️ این اسکریپت جدول‌های قبلی را پاک و دوباره می‌سازد (داده‌های تستی از بین می‌روند)
drop table if exists answers;
drop table if exists questions;
drop table if exists guests;

create table guests(
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  secret text default '',          -- سال تولد (رمز ورود)
  is_default boolean default false,
  created_at timestamptz default now()
);
create table questions(
  id uuid primary key default gen_random_uuid(),
  owner text not null check (owner in ('host','guest')),
  guest_id uuid references guests(id) on delete cascade,
  prompt text default '',
  statements jsonb not null,
  truth_index int not null check (truth_index between 0 and 2),
  story text default '',
  created_at timestamptz default now(),
  check ((owner='host' and guest_id is null) or (owner='guest' and guest_id is not null))
);
create table answers(
  id uuid primary key default gen_random_uuid(),
  question_id uuid references questions(id) on delete cascade,
  responder text not null,          -- 'host' یا آیدی مهمان
  picked_lies int[] not null,
  correct boolean not null,
  created_at timestamptz default now(),
  unique(question_id, responder)
);
alter table guests enable row level security;
alter table questions enable row level security;
alter table answers enable row level security;
create policy "open g" on guests for all to anon using (true) with check (true);
create policy "open q" on questions for all to anon using (true) with check (true);
create policy "open a" on answers for all to anon using (true) with check (true);

insert into guests(name, slug, secret, is_default) values ('یسنا', 'yasna', '', true);