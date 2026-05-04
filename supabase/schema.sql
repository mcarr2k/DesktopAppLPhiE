-- ==========================================================
-- LPhiE BZ Dashboard — schema.sql
-- Run this FIRST in the Supabase SQL editor.
-- Idempotent: safe to re-run.
-- ==========================================================

-- ----- ENUMS --------------------------------------------------
do $$ begin
  create type role_t as enum (
    'president','vp_internal','vp_external','treasurer','secretary','member'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type event_visibility_t as enum ('global','eboard_only');
exception when duplicate_object then null; end $$;

do $$ begin
  create type member_status_t as enum ('active','alumni','pledge','inactive');
exception when duplicate_object then null; end $$;

do $$ begin
  create type fine_status_t as enum ('pending','approved','paid','waived');
exception when duplicate_object then null; end $$;

do $$ begin
  create type dues_status_t as enum ('paid','partial','unpaid','waived');
exception when duplicate_object then null; end $$;

do $$ begin
  create type transaction_kind_t as enum ('income','expense');
exception when duplicate_object then null; end $$;

do $$ begin
  create type minutes_kind_t as enum ('regular','cabinet','special');
exception when duplicate_object then null; end $$;

do $$ begin
  create type task_status_t as enum ('open','in_progress','done','cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type task_priority_t as enum ('low','normal','high','urgent');
exception when duplicate_object then null; end $$;

-- ----- PROFILES -----------------------------------------------
-- Profiles must exist before the helper functions, because
-- Supabase validates function bodies at creation time
-- (check_function_bodies = on by default).
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null unique,
  phone text,
  role role_t not null default 'member',
  status member_status_t not null default 'active',
  pledge_class text,
  graduation_year int,
  avatar_url text,
  -- Cabinet / committee chair title (e.g. "Rush Chair", "Historian").
  -- Free-form text so the chapter can extend without a schema change.
  -- This is purely descriptive — RLS / e-board checks key off `role`.
  title text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- Idempotent column add for existing installations on previous schema.
alter table profiles add column if not exists title text;
-- Payment handles. Treasurer publishes their Venmo + Zelle so members
-- can pay dues. Other brothers may still fill these in for reimbursements.
alter table profiles add column if not exists venmo_handle text;
alter table profiles add column if not exists zelle_handle text;
create index if not exists profiles_role_idx on profiles(role);
create index if not exists profiles_status_idx on profiles(status);

-- ----- HELPERS ------------------------------------------------
create or replace function public.current_role()
returns role_t language sql stable security definer set search_path = public as $$
  select role from profiles where id = auth.uid();
$$;

create or replace function public.is_eboard()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(
    (select role from profiles where id = auth.uid())
      in ('president','vp_internal','vp_external','treasurer','secretary'),
    false);
$$;

-- ----- EVENTS -------------------------------------------------
create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  location text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  visibility event_visibility_t not null default 'global',
  color text,
  created_by uuid not null references profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at >= starts_at)
);
create index if not exists events_starts_idx on events(starts_at);
create index if not exists events_visibility_idx on events(visibility);

-- ----- FINES --------------------------------------------------
create table if not exists fines (
  id uuid primary key default gen_random_uuid(),
  brother_id uuid not null references profiles(id) on delete restrict,
  amount_cents int not null check (amount_cents > 0),
  reason text not null,
  status fine_status_t not null default 'pending',
  issued_by uuid not null references profiles(id),
  issued_at timestamptz not null default now(),
  resolved_by uuid references profiles(id),
  resolved_at timestamptz,
  notes text
);
create index if not exists fines_brother_idx on fines(brother_id);
create index if not exists fines_status_idx on fines(status);

-- ----- DUES ---------------------------------------------------
create table if not exists dues (
  id uuid primary key default gen_random_uuid(),
  brother_id uuid not null references profiles(id) on delete cascade,
  semester text not null,
  amount_owed_cents int not null,
  amount_paid_cents int not null default 0,
  status dues_status_t not null default 'unpaid',
  due_date date,
  notes text,
  updated_at timestamptz not null default now(),
  unique (brother_id, semester)
);

-- ----- TRANSACTIONS -------------------------------------------
create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  kind transaction_kind_t not null,
  amount_cents int not null check (amount_cents > 0),
  category text,
  memo text,
  occurred_on date not null,
  recorded_by uuid not null references profiles(id),
  linked_fine_id uuid references fines(id),
  linked_dues_id uuid references dues(id),
  created_at timestamptz not null default now()
);
create index if not exists transactions_kind_idx on transactions(kind);
create index if not exists transactions_date_idx on transactions(occurred_on);

-- ----- MINUTES + ATTENDANCE -----------------------------------
create table if not exists minutes (
  id uuid primary key default gen_random_uuid(),
  kind minutes_kind_t not null,
  meeting_date date not null,
  title text not null,
  body_html text not null default '',
  body_text text not null default '',
  author_id uuid not null references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists minutes_date_idx on minutes(meeting_date desc);
create index if not exists minutes_fts_idx on minutes
  using gin (to_tsvector('english', title || ' ' || body_text));

create table if not exists attendance (
  minutes_id uuid not null references minutes(id) on delete cascade,
  brother_id uuid not null references profiles(id) on delete cascade,
  present boolean not null default false,
  excused boolean not null default false,
  primary key (minutes_id, brother_id)
);

-- ----- SOPS ---------------------------------------------------
create table if not exists sops (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text,
  body_html text not null default '',
  version int not null default 1,
  updated_by uuid not null references profiles(id),
  updated_at timestamptz not null default now()
);

-- ----- CHECK_INS ----------------------------------------------
create table if not exists check_ins (
  id uuid primary key default gen_random_uuid(),
  brother_id uuid not null references profiles(id) on delete cascade,
  semester text not null,
  conducted_by uuid not null references profiles(id),
  conducted_at timestamptz not null default now(),
  notes text,
  unique (brother_id, semester)
);

-- ----- ALUMNI EMAILS ------------------------------------------
create table if not exists alumni_emails (
  id uuid primary key default gen_random_uuid(),
  send_month date not null,
  subject text not null,
  body_html text not null,
  sent_at timestamptz,
  composed_by uuid not null references profiles(id),
  created_at timestamptz not null default now()
);
create index if not exists alumni_emails_month_idx on alumni_emails(send_month desc);

-- ----- TASKS --------------------------------------------------
-- Officers delegate work to brothers (e.g. Treasurer assigns
-- "Run Chipotle fundraiser Friday" to the Fundraising Chair).
create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  assigned_to uuid not null references profiles(id) on delete cascade,
  assigned_by uuid not null references profiles(id),
  status task_status_t not null default 'open',
  priority task_priority_t not null default 'normal',
  category text,
  related_role role_t,
  due_date date,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists tasks_assigned_to_idx on tasks(assigned_to);
create index if not exists tasks_status_idx     on tasks(status);
create index if not exists tasks_due_date_idx   on tasks(due_date);

-- ----- DUES INSTALLMENTS --------------------------------------
-- Payment plan rows underneath a dues record. The total of all
-- installments should match the parent dues.amount_owed_cents.
-- A trigger keeps dues.amount_paid_cents and dues.status in sync.
create table if not exists dues_installments (
  id uuid primary key default gen_random_uuid(),
  dues_id uuid not null references dues(id) on delete cascade,
  amount_cents int not null check (amount_cents > 0),
  due_date date not null,
  paid_on date,
  paid_amount_cents int,
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists dues_installments_dues_idx on dues_installments(dues_id);

-- ----- LIAISON CONTACTS (VP External) -------------------------
create table if not exists liaison_contacts (
  id uuid primary key default gen_random_uuid(),
  organization text not null,
  contact_name text not null,
  contact_role text,
  email text,
  phone text,
  notes text,
  created_by uuid not null references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ----- DUES PAYMENT CLAIMS ------------------------------------
-- Members self-report a payment after sending money via Venmo /
-- Zelle / cash. Treasurer reviews, confirms, and the parent dues
-- row updates automatically through the dues_installments trigger.
do $$ begin
  create type payment_method_t as enum ('venmo','zelle','cash','check','other');
exception when duplicate_object then null; end $$;

create table if not exists dues_payment_claims (
  id uuid primary key default gen_random_uuid(),
  dues_id uuid not null references dues(id) on delete cascade,
  brother_id uuid not null references profiles(id) on delete cascade,
  method payment_method_t not null,
  amount_cents int not null check (amount_cents > 0),
  external_handle text,                          -- where they sent it
  memo text,
  claimed_at timestamptz not null default now(),
  confirmed_by uuid references profiles(id),
  confirmed_at timestamptz,
  rejected_reason text,
  installment_id uuid references dues_installments(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists dues_claims_brother_idx on dues_payment_claims(brother_id);
create index if not exists dues_claims_dues_idx    on dues_payment_claims(dues_id);
create index if not exists dues_claims_pending_idx on dues_payment_claims(confirmed_at)
  where confirmed_at is null and rejected_reason is null;

-- When Treasurer confirms a claim, materialize an installment so the
-- existing sync trigger updates the parent dues row's paid total &
-- status. When un-confirming, drop the installment.
create or replace function sync_dues_claim_to_installment()
returns trigger language plpgsql as $$
begin
  -- CONFIRMED transition: claim becomes confirmed → create installment
  if new.confirmed_at is not null
     and (old is null or old.confirmed_at is null) then
    insert into dues_installments
      (dues_id, amount_cents, due_date, paid_on, paid_amount_cents, notes)
    values
      (new.dues_id, new.amount_cents, current_date, current_date,
       new.amount_cents,
       'Confirmed claim ' || new.id || ' (' || new.method || ')')
    returning id into new.installment_id;
    return new;
  end if;

  -- UN-confirmed: claim was reverted → remove the installment row
  if old is not null
     and old.confirmed_at is not null
     and new.confirmed_at is null
     and old.installment_id is not null then
    delete from dues_installments where id = old.installment_id;
    new.installment_id := null;
    return new;
  end if;

  return new;
end $$;

drop trigger if exists dues_payment_claims_sync on dues_payment_claims;
create trigger dues_payment_claims_sync
  before update on dues_payment_claims
  for each row execute function sync_dues_claim_to_installment();

-- ----- STATE OF FRATERNITY REPORTS (President) ----------------
-- Periodic report to the Board of Directors. Captures both the
-- author's narrative and a JSON snapshot of the stats at the time
-- of writing — so historical reports stay coherent even after the
-- underlying data changes.
create table if not exists state_reports (
  id uuid primary key default gen_random_uuid(),
  period text not null,                     -- e.g. "FA25", "FA25-Q1"
  title text not null,
  body_html text not null default '',
  body_text text not null default '',
  stats_snapshot jsonb not null default '{}'::jsonb,
  author_id uuid not null references profiles(id),
  finalized boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists state_reports_period_idx on state_reports(period);
create index if not exists state_reports_created_idx on state_reports(created_at desc);

-- ----- FORMAL PLAN (VP External) ------------------------------
-- One in-progress plan per academic year. Tracks venue, budget,
-- date, headcount, and a free-form planning checklist (jsonb).
create table if not exists formal_plans (
  id uuid primary key default gen_random_uuid(),
  academic_year text not null unique,           -- e.g. "2025-2026"
  theme text,
  event_date date,
  venue_name text,
  venue_address text,
  venue_contact text,
  budget_cents int,
  expected_headcount int,
  status text not null default 'planning',      -- planning | confirmed | done
  notes text,
  checklist jsonb not null default '[]'::jsonb, -- [{title, done, owner_id}]
  created_by uuid not null references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists formal_rsvps (
  formal_id uuid not null references formal_plans(id) on delete cascade,
  brother_id uuid not null references profiles(id) on delete cascade,
  attending boolean not null default false,
  plus_one_name text,
  dietary_notes text,
  responded_at timestamptz not null default now(),
  primary key (formal_id, brother_id)
);

-- ----- DOCUMENTS (Secretary + VP External) --------------------
-- Metadata for files stored in Supabase Storage. The actual bytes
-- live in the `chapter-records` bucket. `kind` distinguishes
-- constitution / sop / record / publicity / other.
do $$ begin
  create type document_kind_t as enum (
    'constitution','sop','record','publicity','other'
  );
exception when duplicate_object then null; end $$;

create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  kind document_kind_t not null default 'record',
  storage_path text not null,                  -- e.g. "records/{uuid}.pdf"
  mime_type text,
  size_bytes int,
  uploaded_by uuid not null references profiles(id),
  uploaded_at timestamptz not null default now()
);
create index if not exists documents_kind_idx on documents(kind);
create index if not exists documents_uploaded_idx on documents(uploaded_at desc);

-- ----- STORAGE BUCKET -----------------------------------------
-- Creates the `chapter-records` bucket if it doesn't exist. The
-- bucket is private by default; objects are accessed via signed
-- URLs from the renderer. Safe to re-run.
insert into storage.buckets (id, name, public)
values ('chapter-records', 'chapter-records', false)
on conflict (id) do nothing;

-- ----- BUDGET ITEMS (Treasurer) -------------------------------
-- Per-semester projected income & expense lines. Plain rows so
-- the Treasurer can edit, add, or delete inline.
do $$ begin
  create type budget_kind_t as enum ('income','expense');
exception when duplicate_object then null; end $$;

create table if not exists budget_items (
  id uuid primary key default gen_random_uuid(),
  semester text not null,
  kind budget_kind_t not null,
  category text not null,
  memo text,
  projected_cents int not null check (projected_cents >= 0),
  actual_cents int not null default 0,
  created_by uuid not null references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists budget_items_semester_idx on budget_items(semester);

-- ----- AGENDAS (President) ------------------------------------
-- Agenda is built ahead of a meeting; once the meeting happens
-- the Secretary can convert it to a Minutes record.
create table if not exists agendas (
  id uuid primary key default gen_random_uuid(),
  meeting_date date not null,
  title text not null,
  body_html text not null default '',
  body_text text not null default '',
  linked_event_id uuid references events(id) on delete set null,
  author_id uuid not null references profiles(id),
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists agendas_date_idx on agendas(meeting_date desc);

-- ----- updated_at TRIGGER -------------------------------------
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists profiles_updated on profiles;
create trigger profiles_updated  before update on profiles
  for each row execute function set_updated_at();

drop trigger if exists events_updated on events;
create trigger events_updated    before update on events
  for each row execute function set_updated_at();

drop trigger if exists minutes_updated on minutes;
create trigger minutes_updated   before update on minutes
  for each row execute function set_updated_at();

drop trigger if exists dues_updated on dues;
create trigger dues_updated      before update on dues
  for each row execute function set_updated_at();

drop trigger if exists tasks_updated on tasks;
create trigger tasks_updated     before update on tasks
  for each row execute function set_updated_at();

drop trigger if exists liaison_contacts_updated on liaison_contacts;
create trigger liaison_contacts_updated before update on liaison_contacts
  for each row execute function set_updated_at();

drop trigger if exists agendas_updated on agendas;
create trigger agendas_updated   before update on agendas
  for each row execute function set_updated_at();

drop trigger if exists budget_items_updated on budget_items;
create trigger budget_items_updated before update on budget_items
  for each row execute function set_updated_at();

drop trigger if exists formal_plans_updated on formal_plans;
create trigger formal_plans_updated before update on formal_plans
  for each row execute function set_updated_at();

drop trigger if exists state_reports_updated on state_reports;
create trigger state_reports_updated before update on state_reports
  for each row execute function set_updated_at();

-- ----- DUES INSTALLMENT SYNC ----------------------------------
-- When an installment row is paid (or unpaid), recompute the
-- parent dues record's paid total and status enum.
create or replace function sync_dues_from_installments()
returns trigger language plpgsql as $$
declare
  d_id uuid := coalesce(new.dues_id, old.dues_id);
  total_paid int;
  total_owed int;
begin
  select coalesce(sum(coalesce(paid_amount_cents, 0)), 0)
    into total_paid
    from dues_installments
    where dues_id = d_id;

  select amount_owed_cents into total_owed from dues where id = d_id;

  update dues
     set amount_paid_cents = total_paid,
         status = case
           when total_paid <= 0 then 'unpaid'::dues_status_t
           when total_paid >= total_owed then 'paid'::dues_status_t
           else 'partial'::dues_status_t
         end
   where id = d_id;

  return null;
end $$;

drop trigger if exists dues_installments_sync on dues_installments;
create trigger dues_installments_sync
  after insert or update or delete on dues_installments
  for each row execute function sync_dues_from_installments();

-- ----- TASK COMPLETED_AT --------------------------------------
create or replace function set_task_completed_at()
returns trigger language plpgsql as $$
begin
  if new.status = 'done' and (old.status is distinct from 'done') then
    new.completed_at = now();
  elsif new.status <> 'done' then
    new.completed_at = null;
  end if;
  return new;
end $$;

drop trigger if exists tasks_completed_at on tasks;
create trigger tasks_completed_at
  before update on tasks
  for each row execute function set_task_completed_at();

-- ----- REALTIME PUBLICATION -----------------------------------
-- Opt these tables into Supabase Realtime so the UI updates
-- without page refreshes when officers make changes.
do $$ begin
  alter publication supabase_realtime add table events;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table tasks;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table profiles;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table fines;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table dues;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table dues_installments;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table transactions;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table minutes;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table attendance;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table sops;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table check_ins;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table alumni_emails;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table liaison_contacts;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table agendas;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table budget_items;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table documents;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table formal_plans;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table formal_rsvps;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table state_reports;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table dues_payment_claims;
exception when duplicate_object then null; end $$;
