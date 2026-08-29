-- =====================================================================
-- App de Finanzas Personales — esquema completo
-- Pegar en Supabase → SQL Editor → Run
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------- profiles
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  currency    text not null default 'HNL',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------- accounts
create table if not exists public.accounts (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  name            text not null,
  type            text not null default 'cash'
                  check (type in ('cash','checking','savings','credit_card','investment','other')),
  initial_balance numeric(14,2) not null default 0,
  currency        text not null default 'HNL',
  institution     text,
  last4           text check (last4 is null or last4 ~ '^[0-9]{4}$'), -- nunca el número completo
  archived        boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ------------------------------------------------------------- categories
create table if not exists public.categories (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  name       text not null,
  type       text not null check (type in ('income','expense')),
  color      text not null default '#6366f1',
  icon       text,
  created_at timestamptz not null default now(),
  unique (user_id, name, type)
);

-- -------------------------------------------------------- payment_methods
create table if not exists public.payment_methods (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  name       text not null,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

-- ----------------------------------------------------------- transactions
create table if not exists public.transactions (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  account_id        uuid not null references public.accounts(id) on delete cascade,
  category_id       uuid references public.categories(id) on delete set null,
  payment_method_id uuid references public.payment_methods(id) on delete set null,
  type              text not null check (type in ('income','expense')),
  amount            numeric(14,2) not null check (amount > 0),
  description       text,
  date              date not null default current_date,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists transactions_user_date_idx on public.transactions(user_id, date desc);
create index if not exists transactions_account_idx   on public.transactions(account_id);
create index if not exists transactions_category_idx  on public.transactions(category_id);

-- -------------------------------------------------------------- transfers
create table if not exists public.transfers (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  from_account_id uuid not null references public.accounts(id) on delete cascade,
  to_account_id   uuid not null references public.accounts(id) on delete cascade,
  amount          numeric(14,2) not null check (amount > 0),
  description     text,
  date            date not null default current_date,
  created_at      timestamptz not null default now(),
  check (from_account_id <> to_account_id)
);

create index if not exists transfers_user_date_idx on public.transfers(user_id, date desc);

-- ---------------------------------------------------------------- budgets
create table if not exists public.budgets (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  amount      numeric(14,2) not null check (amount > 0),
  month       int not null check (month between 1 and 12),
  year        int not null check (year between 2000 and 2100),
  created_at  timestamptz not null default now(),
  unique (user_id, category_id, month, year)
);

-- ------------------------------------------------------------------ goals
create table if not exists public.goals (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  name          text not null,
  description   text,
  target_amount numeric(14,2) not null check (target_amount > 0),
  target_date   date,
  completed     boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ----------------------------------------------------- goal_contributions
create table if not exists public.goal_contributions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  goal_id    uuid not null references public.goals(id) on delete cascade,
  amount     numeric(14,2) not null check (amount <> 0),
  date       date not null default current_date,
  note       text,
  created_at timestamptz not null default now()
);

create index if not exists goal_contributions_goal_idx on public.goal_contributions(goal_id);

-- ------------------------------------------------------------------ loans
-- direction: 'lent'     = yo presté, me deben
--            'borrowed' = me prestaron, yo debo
create table if not exists public.loans (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  direction   text not null check (direction in ('lent','borrowed')),
  person      text not null,
  amount      numeric(14,2) not null check (amount > 0),
  description text,
  date        date not null default current_date,
  due_date    date,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists loans_user_idx on public.loans(user_id, date desc);

-- Abonos: pagos parciales o totales del préstamo
create table if not exists public.loan_payments (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  loan_id    uuid not null references public.loans(id) on delete cascade,
  amount     numeric(14,2) not null check (amount > 0),
  date       date not null default current_date,
  note       text,
  created_at timestamptz not null default now()
);

create index if not exists loan_payments_loan_idx on public.loan_payments(loan_id);

-- =====================================================================
-- updated_at automático
-- =====================================================================
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array['profiles','accounts','transactions','goals','loans'] loop
    execute format('drop trigger if exists trg_touch_%1$s on public.%1$s', t);
    execute format(
      'create trigger trg_touch_%1$s before update on public.%1$s
       for each row execute function public.touch_updated_at()', t);
  end loop;
end$$;

-- =====================================================================
-- Vista: balance actual por cuenta (calculado, nunca duplicado)
-- =====================================================================
create or replace view public.account_balances as
select
  a.id                as account_id,
  a.user_id,
  a.name,
  a.type,
  a.currency,
  a.institution,
  a.archived,
  a.initial_balance,
  a.initial_balance
    + coalesce((select sum(case when t.type = 'income' then t.amount else -t.amount end)
                from public.transactions t where t.account_id = a.id), 0)
    + coalesce((select sum(tr.amount) from public.transfers tr where tr.to_account_id   = a.id), 0)
    - coalesce((select sum(tr.amount) from public.transfers tr where tr.from_account_id = a.id), 0)
  as current_balance
from public.accounts a;

-- =====================================================================
-- Datos por defecto al registrarse
-- =====================================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_id uuid := new.id;
begin
  insert into public.profiles (id, full_name)
  values (v_id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;

  insert into public.accounts (user_id, name, type, initial_balance, currency)
  values (v_id, 'Efectivo', 'cash', 0, 'HNL');

  insert into public.payment_methods (user_id, name) values
    (v_id, 'Efectivo'), (v_id, 'Tarjeta de débito'), (v_id, 'Tarjeta de crédito'),
    (v_id, 'Transferencia'), (v_id, 'Otro');

  insert into public.categories (user_id, name, type, color) values
    (v_id, 'Salario',        'income',  '#16a34a'),
    (v_id, 'Freelance',      'income',  '#0ea5e9'),
    (v_id, 'Bonificación',   'income',  '#8b5cf6'),
    (v_id, 'Intereses',      'income',  '#f59e0b'),
    (v_id, 'Negocio',        'income',  '#14b8a6'),
    (v_id, 'Otros',          'income',  '#64748b'),
    (v_id, 'Alimentación',   'expense', '#ef4444'),
    (v_id, 'Transporte',     'expense', '#f97316'),
    (v_id, 'Vivienda',       'expense', '#8b5cf6'),
    (v_id, 'Servicios',      'expense', '#0ea5e9'),
    (v_id, 'Internet',       'expense', '#06b6d4'),
    (v_id, 'Teléfono',       'expense', '#3b82f6'),
    (v_id, 'Entretenimiento','expense', '#ec4899'),
    (v_id, 'Salud',          'expense', '#10b981'),
    (v_id, 'Educación',      'expense', '#6366f1'),
    (v_id, 'Compras',        'expense', '#eab308'),
    (v_id, 'Suscripciones',  'expense', '#a855f7'),
    (v_id, 'Viajes',         'expense', '#14b8a6'),
    (v_id, 'Otros',          'expense', '#64748b');

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =====================================================================
-- Row Level Security — cada usuario solo ve lo suyo
-- =====================================================================
alter table public.profiles           enable row level security;
alter table public.accounts           enable row level security;
alter table public.categories         enable row level security;
alter table public.payment_methods    enable row level security;
alter table public.transactions       enable row level security;
alter table public.transfers          enable row level security;
alter table public.budgets            enable row level security;
alter table public.goals              enable row level security;
alter table public.goal_contributions enable row level security;
alter table public.loans               enable row level security;
alter table public.loan_payments       enable row level security;

drop policy if exists "profiles_own" on public.profiles;
create policy "profiles_own" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

do $$
declare t text;
begin
  foreach t in array array['accounts','categories','payment_methods','transactions',
                           'transfers','budgets','goals','goal_contributions',
                           'loans','loan_payments'] loop
    execute format('drop policy if exists "%1$s_own" on public.%1$s', t);
    execute format(
      'create policy "%1$s_own" on public.%1$s
       for all using (auth.uid() = user_id) with check (auth.uid() = user_id)', t);
  end loop;
end$$;

-- La vista hereda el RLS de las tablas base (security_invoker)
alter view public.account_balances set (security_invoker = on);
