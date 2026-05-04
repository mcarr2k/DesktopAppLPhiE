-- ==========================================================
-- LPhiE BZ Dashboard — policies.sql
-- Run this AFTER schema.sql in the Supabase SQL editor.
-- Idempotent: drops then recreates each policy.
-- ==========================================================

alter table profiles            enable row level security;
alter table events              enable row level security;
alter table fines               enable row level security;
alter table dues                enable row level security;
alter table dues_installments   enable row level security;
alter table transactions        enable row level security;
alter table minutes             enable row level security;
alter table attendance          enable row level security;
alter table sops                enable row level security;
alter table check_ins           enable row level security;
alter table alumni_emails       enable row level security;
alter table tasks               enable row level security;
alter table liaison_contacts    enable row level security;
alter table agendas             enable row level security;

-- ----- PROFILES -----------------------------------------------
drop policy if exists profiles_select        on profiles;
drop policy if exists profiles_self_update   on profiles;
drop policy if exists profiles_admin_update  on profiles;
drop policy if exists profiles_insert        on profiles;

create policy profiles_select on profiles
  for select to authenticated using (true);

-- Self-update cannot change role: with-check pins role to current value.
create policy profiles_self_update on profiles
  for update to authenticated
  using (id = auth.uid())
  with check (
    id = auth.uid()
    and role = (select role from profiles where id = auth.uid())
  );

create policy profiles_admin_update on profiles
  for update to authenticated
  using (public.current_role() in ('president','treasurer'))
  with check (public.current_role() in ('president','treasurer'));

create policy profiles_insert on profiles
  for insert to authenticated
  with check (id = auth.uid());

-- ----- EVENTS -------------------------------------------------
drop policy if exists events_select_global         on events;
drop policy if exists events_insert_member_global  on events;
drop policy if exists events_insert_eboard_any     on events;
drop policy if exists events_update_creator        on events;
drop policy if exists events_update_eboard         on events;
drop policy if exists events_delete                on events;

create policy events_select_global on events
  for select to authenticated
  using (visibility = 'global' or public.is_eboard());

create policy events_insert_member_global on events
  for insert to authenticated
  with check (visibility = 'global' and created_by = auth.uid());

create policy events_insert_eboard_any on events
  for insert to authenticated
  with check (public.is_eboard() and created_by = auth.uid());

create policy events_update_creator on events
  for update to authenticated
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

create policy events_update_eboard on events
  for update to authenticated
  using (public.is_eboard()) with check (public.is_eboard());

create policy events_delete on events
  for delete to authenticated
  using (public.is_eboard() or created_by = auth.uid());

-- ----- FINES --------------------------------------------------
drop policy if exists fines_select          on fines;
drop policy if exists fines_insert_vpi      on fines;
drop policy if exists fines_update_treas    on fines;

create policy fines_select on fines
  for select to authenticated
  using (brother_id = auth.uid() or public.is_eboard());

create policy fines_insert_vpi on fines
  for insert to authenticated
  with check (public.current_role() in ('vp_internal','president'));

create policy fines_update_treas on fines
  for update to authenticated
  using (public.current_role() in ('treasurer','president'))
  with check (public.current_role() in ('treasurer','president'));

-- ----- DUES ---------------------------------------------------
drop policy if exists dues_select on dues;
drop policy if exists dues_write  on dues;

create policy dues_select on dues
  for select to authenticated
  using (brother_id = auth.uid() or public.is_eboard());

create policy dues_write on dues
  for all to authenticated
  using (public.current_role() in ('treasurer','president'))
  with check (public.current_role() in ('treasurer','president'));

-- ----- TRANSACTIONS -------------------------------------------
drop policy if exists tx_select on transactions;
drop policy if exists tx_write  on transactions;

create policy tx_select on transactions
  for select to authenticated using (public.is_eboard());

create policy tx_write on transactions
  for all to authenticated
  using (public.current_role() in ('treasurer','president'))
  with check (public.current_role() in ('treasurer','president'));

-- ----- MINUTES + ATTENDANCE -----------------------------------
drop policy if exists minutes_select    on minutes;
drop policy if exists minutes_write     on minutes;
drop policy if exists attendance_select on attendance;
drop policy if exists attendance_write  on attendance;

create policy minutes_select on minutes
  for select to authenticated using (true);

create policy minutes_write on minutes
  for all to authenticated
  using (public.current_role() in ('secretary','president'))
  with check (public.current_role() in ('secretary','president'));

create policy attendance_select on attendance
  for select to authenticated using (true);

create policy attendance_write on attendance
  for all to authenticated
  using (public.current_role() in ('secretary','president'))
  with check (public.current_role() in ('secretary','president'));

-- ----- SOPS ---------------------------------------------------
drop policy if exists sops_select on sops;
drop policy if exists sops_write  on sops;

create policy sops_select on sops
  for select to authenticated using (true);

create policy sops_write on sops
  for all to authenticated
  using (public.current_role() in ('vp_internal','president'))
  with check (public.current_role() in ('vp_internal','president'));

-- ----- CHECK_INS ----------------------------------------------
drop policy if exists checkins_select on check_ins;
drop policy if exists checkins_write  on check_ins;

create policy checkins_select on check_ins
  for select to authenticated
  using (brother_id = auth.uid() or public.current_role() in ('vp_internal','president'));

create policy checkins_write on check_ins
  for all to authenticated
  using (public.current_role() in ('vp_internal','president'))
  with check (public.current_role() in ('vp_internal','president'));

-- ----- ALUMNI EMAILS ------------------------------------------
drop policy if exists alumni_select on alumni_emails;
drop policy if exists alumni_write  on alumni_emails;

create policy alumni_select on alumni_emails
  for select to authenticated using (public.is_eboard());

create policy alumni_write on alumni_emails
  for all to authenticated
  using (public.current_role() in ('secretary','president'))
  with check (public.current_role() in ('secretary','president'));

-- ----- TASKS --------------------------------------------------
drop policy if exists tasks_select        on tasks;
drop policy if exists tasks_insert_eboard on tasks;
drop policy if exists tasks_update_self   on tasks;
drop policy if exists tasks_update_admin  on tasks;
drop policy if exists tasks_delete_admin  on tasks;

-- Everyone reads tasks; an assignee needs to see their work,
-- an officer needs to see what they've delegated, and the wider
-- chapter benefits from visibility.
create policy tasks_select on tasks
  for select to authenticated using (true);

-- Only e-board members can create new task assignments.
create policy tasks_insert_eboard on tasks
  for insert to authenticated
  with check (public.is_eboard() and assigned_by = auth.uid());

-- The assignee can move their own task through statuses.
-- We don't try to enforce "only status/priority" at the RLS layer
-- (the self-reference subquery is awkward in Postgres). The app
-- only sends status changes from the assignee path; if a brother
-- got cute and edited the title via the API, the cost is low.
create policy tasks_update_self on tasks
  for update to authenticated
  using (assigned_to = auth.uid())
  with check (assigned_to = auth.uid());

-- The assigner or any e-board member can fully edit the task.
create policy tasks_update_admin on tasks
  for update to authenticated
  using (assigned_by = auth.uid() or public.is_eboard())
  with check (assigned_by = auth.uid() or public.is_eboard());

create policy tasks_delete_admin on tasks
  for delete to authenticated
  using (assigned_by = auth.uid() or public.is_eboard());

-- ----- DUES INSTALLMENTS --------------------------------------
drop policy if exists dues_inst_select on dues_installments;
drop policy if exists dues_inst_write  on dues_installments;

create policy dues_inst_select on dues_installments
  for select to authenticated
  using (
    public.is_eboard()
    or exists (
      select 1 from dues d
      where d.id = dues_installments.dues_id
        and d.brother_id = auth.uid()
    )
  );

create policy dues_inst_write on dues_installments
  for all to authenticated
  using (public.current_role() in ('treasurer','president'))
  with check (public.current_role() in ('treasurer','president'));

-- ----- LIAISON CONTACTS (VP External) -------------------------
drop policy if exists liaisons_select on liaison_contacts;
drop policy if exists liaisons_write  on liaison_contacts;

create policy liaisons_select on liaison_contacts
  for select to authenticated using (true);

create policy liaisons_write on liaison_contacts
  for all to authenticated
  using (public.current_role() in ('vp_external','president'))
  with check (public.current_role() in ('vp_external','president'));

-- ----- AGENDAS (President) ------------------------------------
drop policy if exists agendas_select_published on agendas;
drop policy if exists agendas_select_admin     on agendas;
drop policy if exists agendas_write            on agendas;

-- Brothers can read agendas only after they're published.
create policy agendas_select_published on agendas
  for select to authenticated
  using (published = true);

-- E-board members see drafts too.
create policy agendas_select_admin on agendas
  for select to authenticated
  using (public.is_eboard());

create policy agendas_write on agendas
  for all to authenticated
  using (public.current_role() in ('president','secretary'))
  with check (public.current_role() in ('president','secretary'));

-- ----- BUDGET ITEMS (Treasurer) -------------------------------
alter table budget_items enable row level security;

drop policy if exists budget_select on budget_items;
drop policy if exists budget_write  on budget_items;

-- E-board can see the budget; non-officers don't need to.
create policy budget_select on budget_items
  for select to authenticated using (public.is_eboard());

create policy budget_write on budget_items
  for all to authenticated
  using (public.current_role() in ('treasurer','president'))
  with check (public.current_role() in ('treasurer','president'));

-- ----- DOCUMENTS (Secretary + VP External) --------------------
alter table documents enable row level security;

drop policy if exists docs_select        on documents;
drop policy if exists docs_insert_eboard on documents;
drop policy if exists docs_update_admin  on documents;
drop policy if exists docs_delete_admin  on documents;

-- Every member can list every document (constitution, SOPs, archive).
-- Bytes still require a signed URL from storage.
create policy docs_select on documents
  for select to authenticated using (true);

-- E-board members can upload new documents.
create policy docs_insert_eboard on documents
  for insert to authenticated
  with check (public.is_eboard() and uploaded_by = auth.uid());

create policy docs_update_admin on documents
  for update to authenticated
  using (public.is_eboard())
  with check (public.is_eboard());

create policy docs_delete_admin on documents
  for delete to authenticated
  using (public.is_eboard());

-- ----- STORAGE BUCKET POLICIES (chapter-records) --------------
-- The bucket is private. Any authenticated brother can read
-- (signed URL) and any e-board member can upload / delete.
drop policy if exists "chapter-records read"   on storage.objects;
drop policy if exists "chapter-records write"  on storage.objects;
drop policy if exists "chapter-records update" on storage.objects;
drop policy if exists "chapter-records delete" on storage.objects;

create policy "chapter-records read" on storage.objects
  for select to authenticated
  using (bucket_id = 'chapter-records');

create policy "chapter-records write" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'chapter-records' and public.is_eboard());

create policy "chapter-records update" on storage.objects
  for update to authenticated
  using (bucket_id = 'chapter-records' and public.is_eboard())
  with check (bucket_id = 'chapter-records' and public.is_eboard());

create policy "chapter-records delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'chapter-records' and public.is_eboard());

-- ----- DUES PAYMENT CLAIMS ------------------------------------
alter table dues_payment_claims enable row level security;

drop policy if exists claims_select        on dues_payment_claims;
drop policy if exists claims_insert_self   on dues_payment_claims;
drop policy if exists claims_update_admin  on dues_payment_claims;
drop policy if exists claims_delete_admin  on dues_payment_claims;

-- Brother sees own claims; e-board sees all.
create policy claims_select on dues_payment_claims
  for select to authenticated
  using (brother_id = auth.uid() or public.is_eboard());

-- Brother can self-report a payment for their own dues row only.
create policy claims_insert_self on dues_payment_claims
  for insert to authenticated
  with check (
    brother_id = auth.uid()
    and exists (
      select 1 from dues d
      where d.id = dues_payment_claims.dues_id and d.brother_id = auth.uid()
    )
  );

-- Treasurer / President can confirm, reject, or edit any claim.
create policy claims_update_admin on dues_payment_claims
  for update to authenticated
  using (public.current_role() in ('treasurer','president'))
  with check (public.current_role() in ('treasurer','president'));

create policy claims_delete_admin on dues_payment_claims
  for delete to authenticated
  using (public.current_role() in ('treasurer','president'));

-- ----- STATE OF FRATERNITY REPORTS (President) ----------------
alter table state_reports enable row level security;

drop policy if exists state_reports_select on state_reports;
drop policy if exists state_reports_write  on state_reports;

-- E-board reads drafts; finalized reports are visible to everyone.
create policy state_reports_select on state_reports
  for select to authenticated
  using (finalized = true or public.is_eboard());

create policy state_reports_write on state_reports
  for all to authenticated
  using (public.current_role() in ('president','secretary'))
  with check (public.current_role() in ('president','secretary'));

-- ----- FORMAL PLANS (VP External) -----------------------------
alter table formal_plans enable row level security;
alter table formal_rsvps enable row level security;

drop policy if exists formal_select on formal_plans;
drop policy if exists formal_write  on formal_plans;
drop policy if exists rsvp_select   on formal_rsvps;
drop policy if exists rsvp_self     on formal_rsvps;
drop policy if exists rsvp_admin    on formal_rsvps;

-- Brothers see formal info so they can RSVP.
create policy formal_select on formal_plans
  for select to authenticated using (true);

create policy formal_write on formal_plans
  for all to authenticated
  using (public.current_role() in ('vp_external','president'))
  with check (public.current_role() in ('vp_external','president'));

create policy rsvp_select on formal_rsvps
  for select to authenticated using (true);

-- Brothers can manage their own RSVP row.
create policy rsvp_self on formal_rsvps
  for all to authenticated
  using (brother_id = auth.uid())
  with check (brother_id = auth.uid());

-- VP External / President can edit anyone's RSVP.
create policy rsvp_admin on formal_rsvps
  for all to authenticated
  using (public.current_role() in ('vp_external','president'))
  with check (public.current_role() in ('vp_external','president'));
