-- Run this script in the Supabase SQL Editor to set up your Red Roof House Board tables

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  customer_name text not null default '',
  description text default '',
  status text not null check (status in ('todo', 'draft', 'cutting', 'framing', 'backdrop', 'ready_to_ship', 'delivered')) default 'todo',
  priority text not null check (priority in ('low', 'medium', 'high')) default 'medium',
  work_size text not null default 'A4', -- Enum: 'A2', 'A3', 'A4', 'A5'
  agreed_price numeric(12, 2) not null default 0, -- ราคาที่ตกลงกับลูกค้า
  payment_status text not null check (payment_status in ('unpaid_deposit', 'deposit_paid', 'fully_paid')) default 'unpaid_deposit',
  deposit_amount numeric(12, 2) not null default 0, -- ยอดมัดจำที่เก็บมาแล้ว
  month text not null, -- Format: 'YYYY-MM' (e.g., '2026-11')
  due_date date, -- วันกำหนดทำเสร็จ
  delivery_date date, -- วันที่ต้องส่งถึงมือลูกค้า
  position integer default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Table for storing monthly or default quota per work_size
create table if not exists public.size_quotas (
  work_size text primary key,
  max_quota integer not null default 10,
  updated_at timestamptz not null default now()
);

insert into public.size_quotas (work_size, max_quota)
values
  ('A2', 10),
  ('A3', 10),
  ('A4', 10),
  ('A5', 10)
on conflict (work_size) do nothing;

-- Index for fast monthly filtering
create index if not exists idx_tasks_month on public.tasks (month);
create index if not exists idx_tasks_status on public.tasks (status);
create index if not exists idx_tasks_work_size on public.tasks (work_size);

-- Automatically update updated_at timestamp
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_tasks_updated_at on public.tasks;
create trigger set_tasks_updated_at
  before update on public.tasks
  for each row
  execute function public.handle_updated_at();

-- Enable Row Level Security (RLS)
alter table public.tasks enable row level security;
alter table public.size_quotas enable row level security;

drop policy if exists "Allow full access for personal board" on public.tasks;
create policy "Allow full access for personal board"
  on public.tasks
  for all
  using (true)
  with check (true);

drop policy if exists "Allow full access for size_quotas" on public.size_quotas;
create policy "Allow full access for size_quotas"
  on public.size_quotas
  for all
  using (true)
  with check (true);
