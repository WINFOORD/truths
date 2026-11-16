-- این اسکریپت داده‌ها را حفظ می‌کند و فقط چیزهای جدید اضافه می‌کند
alter table guests add column if not exists chat_id bigint;
alter table guests add column if not exists tg_username text;
alter table questions add column if not exists notified boolean default false;
update questions set notified = true;

create table if not exists messages(
  id uuid primary key default gen_random_uuid(),
  guest_id uuid references guests(id) on delete cascade,
  body text not null,
  notified boolean default false,
  created_at timestamptz default now()
);
alter table messages enable row level security;
create policy "open m" on messages for all to anon using (true) with check (true);
