import type { Role } from "./role";

export type MemberStatus = "active" | "alumni" | "pledge" | "inactive";
export type EventVisibility = "global" | "eboard_only";
export type FineStatus = "pending" | "approved" | "paid" | "waived";
export type DuesStatus = "paid" | "partial" | "unpaid" | "waived";
export type TransactionKind = "income" | "expense";
export type MinutesKind = "regular" | "cabinet" | "special";
export type TaskStatus = "open" | "in_progress" | "done" | "cancelled";
export type TaskPriority = "low" | "normal" | "high" | "urgent";

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  role: Role;
  status: MemberStatus;
  pledge_class: string | null;
  graduation_year: number | null;
  avatar_url: string | null;
  /**
   * Cabinet / committee chair titles. A brother can hold several at
   * once (e.g. ["Risk Management Chair", "Service Chair", "Fundraising Chair"]).
   * Empty array when none.
   */
  titles: string[];
  /**
   * Deprecated single-title column from the previous schema. The
   * migration in schema.sql backfills any existing value into
   * `titles`. Read `titles` instead.
   * @deprecated use `titles`
   */
  title: string | null;
  venmo_handle: string | null;
  zelle_handle: string | null;
  created_at: string;
  updated_at: string;
}

export type PaymentMethod = "venmo" | "zelle" | "cash" | "check" | "other";

export interface DuesPaymentClaim {
  id: string;
  dues_id: string;
  brother_id: string;
  method: PaymentMethod;
  amount_cents: number;
  external_handle: string | null;
  memo: string | null;
  claimed_at: string;
  confirmed_by: string | null;
  confirmed_at: string | null;
  rejected_reason: string | null;
  installment_id: string | null;
  created_at: string;
}

export interface ChapterEvent {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  starts_at: string;
  ends_at: string;
  visibility: EventVisibility;
  color: string | null;
  category_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface EventCategory {
  id: string;
  name: string;
  color: string;
  description: string | null;
  is_default: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Fine {
  id: string;
  brother_id: string;
  amount_cents: number;
  reason: string;
  status: FineStatus;
  issued_by: string;
  issued_at: string;
  resolved_by: string | null;
  resolved_at: string | null;
  notes: string | null;
}

export interface Dues {
  id: string;
  brother_id: string;
  semester: string;
  amount_owed_cents: number;
  amount_paid_cents: number;
  status: DuesStatus;
  due_date: string | null;
  notes: string | null;
  updated_at: string;
}

export interface Transaction {
  id: string;
  kind: TransactionKind;
  amount_cents: number;
  category: string | null;
  memo: string | null;
  occurred_on: string;
  recorded_by: string;
  linked_fine_id: string | null;
  linked_dues_id: string | null;
  created_at: string;
}

export interface Minutes {
  id: string;
  kind: MinutesKind;
  meeting_date: string;
  title: string;
  body_html: string;
  body_text: string;
  author_id: string;
  created_at: string;
  updated_at: string;
}

export interface Attendance {
  minutes_id: string;
  brother_id: string;
  present: boolean;
  excused: boolean;
}

export interface Sop {
  id: string;
  title: string;
  category: string | null;
  body_html: string;
  version: number;
  updated_by: string;
  updated_at: string;
}

export interface CheckIn {
  id: string;
  brother_id: string;
  semester: string;
  conducted_by: string;
  conducted_at: string;
  notes: string | null;
}

export interface AlumniEmail {
  id: string;
  send_month: string;
  subject: string;
  body_html: string;
  sent_at: string | null;
  composed_by: string;
  created_at: string;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  assigned_to: string;
  assigned_by: string;
  status: TaskStatus;
  priority: TaskPriority;
  category: string | null;
  related_role: Role | null;
  due_date: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DuesInstallment {
  id: string;
  dues_id: string;
  amount_cents: number;
  due_date: string;
  paid_on: string | null;
  paid_amount_cents: number | null;
  notes: string | null;
  created_at: string;
}

export interface LiaisonContact {
  id: string;
  organization: string;
  contact_name: string;
  contact_role: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export type BudgetKind = "income" | "expense";

export interface StateReportSnapshot {
  generated_at: string;
  active_brothers: number;
  pledges: number;
  alumni: number;
  meetings_held: number;
  avg_attendance_pct: number;
  dues_collected_cents: number;
  dues_outstanding_cents: number;
  income_cents: number;
  expense_cents: number;
  net_cents: number;
  open_fines: number;
  open_fines_cents: number;
}

export interface StateReport {
  id: string;
  period: string;
  title: string;
  body_html: string;
  body_text: string;
  stats_snapshot: StateReportSnapshot | Record<string, never>;
  author_id: string;
  finalized: boolean;
  created_at: string;
  updated_at: string;
}

export type DocumentKind =
  | "constitution"
  | "sop"
  | "record"
  | "publicity"
  | "other";

export interface FormalChecklistItem {
  title: string;
  done: boolean;
  owner_id?: string | null;
}

export interface FormalPlan {
  id: string;
  academic_year: string;
  theme: string | null;
  event_date: string | null;
  venue_name: string | null;
  venue_address: string | null;
  venue_contact: string | null;
  budget_cents: number | null;
  expected_headcount: number | null;
  status: "planning" | "confirmed" | "done";
  notes: string | null;
  checklist: FormalChecklistItem[];
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface FormalRsvp {
  formal_id: string;
  brother_id: string;
  attending: boolean;
  plus_one_name: string | null;
  dietary_notes: string | null;
  responded_at: string;
}

export interface ChapterDocument {
  id: string;
  title: string;
  description: string | null;
  kind: DocumentKind;
  storage_path: string;
  mime_type: string | null;
  size_bytes: number | null;
  uploaded_by: string;
  uploaded_at: string;
}

export interface BudgetItem {
  id: string;
  semester: string;
  kind: BudgetKind;
  category: string;
  memo: string | null;
  projected_cents: number;
  actual_cents: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Agenda {
  id: string;
  meeting_date: string;
  title: string;
  body_html: string;
  body_text: string;
  linked_event_id: string | null;
  author_id: string;
  published: boolean;
  created_at: string;
  updated_at: string;
}
