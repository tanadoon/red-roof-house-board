-- Run this script in the Supabase SQL Editor to set up your Red Roof House Board tables

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  customer_name text not null default '',
  customer_phone text not null default '',
  customer_email text not null default '',
  shipping_address text not null default '',
  description text default '',
  status text not null check (status in ('todo', 'draft', 'cutting', 'framing', 'backdrop', 'ready_to_ship', 'delivered')) default 'todo',
  priority text not null check (priority in ('low', 'medium', 'high')) default 'medium',
  work_size text not null default 'A4', -- Enum: 'A2', 'A3', 'A4', 'A5', '10x15 cm', '20x25 cm', '25x25 cm', '35x35 cm'
  agreed_price numeric(12, 2) not null default 0,
  payment_status text not null check (payment_status in ('unpaid_deposit', 'deposit_paid', 'fully_paid')) default 'unpaid_deposit',
  deposit_amount numeric(12, 2) not null default 0,
  month text not null,
  due_date date,
  delivery_date date,
  position integer default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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
  ('A5', 10),
  ('10x15 cm', 10),
  ('20x25 cm', 10),
  ('25x25 cm', 10),
  ('35x35 cm', 10),
  ('อื่นๆ', 10)
on conflict (work_size) do nothing;

create table if not exists public.shipping_hops (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  hop_order integer not null default 1,
  carrier text not null default 'Flash',
  shipping_type text not null check (shipping_type in ('normal', 'special')) default 'normal',
  route_note text not null default '',
  tracking_no text not null default '',
  shop_cost numeric(12, 2) not null default 0,
  customer_cost numeric(12, 2) not null default 0,
  shipped_at date not null default current_date,
  created_at timestamptz not null default now()
);

create index if not exists idx_shipping_hops_task_id on public.shipping_hops (task_id);
create index if not exists idx_shipping_hops_shipped_at on public.shipping_hops (shipped_at);
