import { useMemo, useState } from "react";
import {
  FileSignature,
  Plus,
  Copy,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { Widget } from "@/components/shell/Widget";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { toast } from "@/components/ui/Toast";
import { MinutesEditor } from "@/components/minutes/MinutesEditor";
import { useAuth } from "@/hooks/useAuth";
import { useDirectory } from "@/hooks/useDirectory";
import { useMinutes } from "@/hooks/useMinutes";
import { useTransactions } from "@/hooks/useTransactions";
import { useDues } from "@/hooks/useDues";
import { useFines } from "@/hooks/useFines";
import { useStateReports } from "@/hooks/useStateReports";
import { supabase } from "@/lib/supabase";
import { formatCents } from "@/lib/format";
import { currentSemester, formatDate } from "@/lib/dates";
import type { StateReport, StateReportSnapshot } from "@/types/db";

interface Props {
  colSpan?: 4 | 6 | 8 | 12;
}

export function StateOfFraternityReport({ colSpan = 6 }: Props) {
  const { user, role } = useAuth();
  const canWrite = role === "president" || role === "secretary";

  const { reports, loading, error, refetch } = useStateReports();
  const { members } = useDirectory();
  const { minutes } = useMinutes();
  const { transactions } = useTransactions();
  const { dues } = useDues();
  const { fines } = useFines();

  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<StateReport | null>(null);

  const dbMissing = !!error && /relation .*state_reports.* does not exist/i.test(error);

  // Build the live stats snapshot. This is what gets baked into
  // `stats_snapshot` whenever someone saves a new report.
  const liveSnapshot = useMemo<StateReportSnapshot>(() => {
    const semester = currentSemester();
    const active = members.filter((m) => m.status === "active").length;
    const pledges = members.filter((m) => m.status === "pledge").length;
    const alumni = members.filter((m) => m.status === "alumni").length;

    const meetingsHeld = minutes.length;
    // (Attendance metrics are best-effort — assume each minutes record has
    //  attendance via a denormalized field. For Phase 3 we leave this as a
    //  placeholder of the count of meetings logged.)
    const avgAttendance = 0;

    const semDues = dues.filter((d) => d.semester === semester);
    const duesCollected = semDues.reduce(
      (s, d) => s + d.amount_paid_cents,
      0
    );
    const duesOutstanding = semDues.reduce(
      (s, d) => s + (d.amount_owed_cents - d.amount_paid_cents),
      0
    );

    const income = transactions
      .filter((t) => t.kind === "income")
      .reduce((s, t) => s + t.amount_cents, 0);
    const expense = transactions
      .filter((t) => t.kind === "expense")
      .reduce((s, t) => s + t.amount_cents, 0);

    const openFines = fines.filter(
      (f) => f.status === "pending" || f.status === "approved"
    );

    return {
      generated_at: new Date().toISOString(),
      active_brothers: active,
      pledges,
      alumni,
      meetings_held: meetingsHeld,
      avg_attendance_pct: avgAttendance,
      dues_collected_cents: duesCollected,
      dues_outstanding_cents: duesOutstanding,
      income_cents: income,
      expense_cents: expense,
      net_cents: income - expense,
      open_fines: openFines.length,
      open_fines_cents: openFines.reduce((s, f) => s + f.amount_cents, 0),
    };
  }, [members, minutes, transactions, dues, fines]);

  function openNew() {
    setEditing(null);
    setEditorOpen(true);
  }

  function openExisting(r: StateReport) {
    setEditing(r);
    setEditorOpen(true);
  }

  return (
    <Widget
      title="State of the fraternity"
      subtitle="Periodic report to the Board of Directors"
      colSpan={colSpan}
      actions={
        canWrite && (
          <Button size="sm" onClick={openNew}>
            <Plus size={12} /> New report
          </Button>
        )
      }
    >
      {dbMissing ? (
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="mb-1 flex items-center gap-2 font-semibold">
            <AlertTriangle size={14} /> state_reports table not set up
          </p>
          <p className="text-xs">
            Re-run <code>supabase/schema.sql</code> followed by{" "}
            <code>supabase/policies.sql</code> in the Supabase SQL editor.
          </p>
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center py-6">
          <Spinner />
        </div>
      ) : (
        <div className="space-y-4">
          <SnapshotPanel snapshot={liveSnapshot} />

          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-lphie-ink/60">
              Past reports
            </p>
            {reports.length === 0 ? (
              <p className="rounded-lg border border-dashed border-lphie-ink/15 bg-white/50 px-4 py-6 text-center text-xs text-lphie-ink/50">
                No reports written yet. Click "New report" to draft one.
              </p>
            ) : (
              <ul className="divide-y divide-lphie-ink/5">
                {reports.slice(0, 5).map((r) => (
                  <li
                    key={r.id}
                    className="flex cursor-pointer items-center justify-between py-2 hover:bg-lphie-cream/40"
                    onClick={() => openExisting(r)}
                  >
                    <div>
                      <p className="font-semibold">{r.title}</p>
                      <p className="text-xs text-lphie-ink/60">
                        {r.period} · {formatDate(r.created_at)}
                      </p>
                    </div>
                    <Badge tone={r.finalized ? "success" : "neutral"}>
                      {r.finalized ? "Finalized" : "Draft"}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {user && (
        <ReportEditorModal
          open={editorOpen}
          onClose={() => setEditorOpen(false)}
          report={editing}
          liveSnapshot={liveSnapshot}
          authorId={user.id}
          onSaved={refetch}
        />
      )}
    </Widget>
  );
}

function SnapshotPanel({ snapshot }: { snapshot: StateReportSnapshot }) {
  const stats = [
    {
      label: "Brothers",
      value: snapshot.active_brothers,
      sub: `${snapshot.pledges} pledges · ${snapshot.alumni} alumni`,
    },
    {
      label: "Meetings logged",
      value: snapshot.meetings_held,
      sub: `Semester to date`,
    },
    {
      label: "Dues collected",
      value: formatCents(snapshot.dues_collected_cents),
      sub: `${formatCents(snapshot.dues_outstanding_cents)} outstanding`,
    },
    {
      label: "Net cash flow",
      value: `${snapshot.net_cents >= 0 ? "+" : ""}${formatCents(snapshot.net_cents)}`,
      sub: `${formatCents(snapshot.income_cents)} in · ${formatCents(snapshot.expense_cents)} out`,
      positive: snapshot.net_cents >= 0,
    },
  ];
  return (
    <div className="rounded-xl border border-lphie-ink/5 bg-lphie-cream/40 p-3">
      <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-lphie-ink/60">
        Live snapshot · auto-baked into your next report
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label}>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-lphie-ink/50">
              {s.label}
            </p>
            <p
              className={`font-display text-xl font-bold ${
                "positive" in s
                  ? s.positive
                    ? "text-emerald-700"
                    : "text-rose-700"
                  : ""
              }`}
            >
              {s.value}
            </p>
            <p className="text-[10px] text-lphie-ink/50">{s.sub}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReportEditorModal({
  open,
  onClose,
  report,
  liveSnapshot,
  authorId,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  report: StateReport | null;
  liveSnapshot: StateReportSnapshot;
  authorId: string;
  onSaved: () => void;
}) {
  const isNew = !report;
  const initial = useMemo(
    () => ({
      period: report?.period ?? currentSemester(),
      title: report?.title ?? `State of the Fraternity · ${currentSemester()}`,
      body_html: report?.body_html ?? defaultBodyHtml(liveSnapshot),
      body_text: report?.body_text ?? defaultBodyText(liveSnapshot),
      finalized: report?.finalized ?? false,
    }),
    // Recompute when we open with a different report; ignore liveSnapshot
    // changes mid-edit so we don't blow away the editor on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [report?.id]
  );

  const [period, setPeriod] = useState(initial.period);
  const [title, setTitle] = useState(initial.title);
  const [bodyHtml, setBodyHtml] = useState(initial.body_html);
  const [bodyText, setBodyText] = useState(initial.body_text);
  const [finalized, setFinalized] = useState(initial.finalized);
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  // Reset fields when the modal target changes.
  useMemo(() => {
    setPeriod(initial.period);
    setTitle(initial.title);
    setBodyHtml(initial.body_html);
    setBodyText(initial.body_text);
    setFinalized(initial.finalized);
  }, [initial]);

  async function save() {
    if (!title.trim()) {
      toast.error("Add a title.");
      return;
    }
    setSubmitting(true);
    const payload = {
      period,
      title: title.trim(),
      body_html: bodyHtml,
      body_text: bodyText,
      stats_snapshot: isNew ? liveSnapshot : report?.stats_snapshot,
      author_id: authorId,
      finalized,
    };
    const { error } = isNew
      ? await supabase.from("state_reports").insert(payload)
      : await supabase
          .from("state_reports")
          .update(payload)
          .eq("id", report!.id);
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(isNew ? "Report saved." : "Report updated.");
    onSaved();
    onClose();
  }

  async function copyText() {
    try {
      await navigator.clipboard.writeText(bodyText);
      setCopied(true);
      toast.success("Plaintext copied.");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy.");
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isNew ? "New state of the fraternity report" : "Edit report"}
      width="lg"
      footer={
        <div className="flex items-center justify-between gap-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={finalized}
              onChange={(e) => setFinalized(e.target.checked)}
            />
            Finalize (visible to all members)
          </label>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={copyText}>
              <Copy size={12} /> {copied ? "Copied" : "Copy text"}
            </Button>
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={save} isLoading={submitting}>
              <FileSignature size={12} /> Save
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <Input
            label="Period"
            value={period}
            onChange={(e) => setPeriod(e.target.value.toUpperCase())}
          />
          <Input
            className="col-span-2"
            label="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        {isNew && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
            <CheckCircle2 size={12} className="mr-1 inline" />
            Saving will lock the live stats above into this report so future
            reads stay historically accurate.
          </div>
        )}

        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-lphie-ink/70">
            Narrative
          </label>
          <MinutesEditor
            value={bodyHtml}
            onChange={(html, text) => {
              setBodyHtml(html);
              setBodyText(text);
            }}
          />
        </div>
      </div>
    </Modal>
  );
}

function defaultBodyText(s: StateReportSnapshot): string {
  return [
    `STATE OF THE FRATERNITY · ${currentSemester()}`,
    ``,
    `Membership: ${s.active_brothers} active brothers, ${s.pledges} pledges, ${s.alumni} alumni.`,
    `Meetings held this semester: ${s.meetings_held}.`,
    `Dues: ${formatCents(s.dues_collected_cents)} collected, ${formatCents(s.dues_outstanding_cents)} outstanding.`,
    `Net cash flow: ${s.net_cents >= 0 ? "+" : ""}${formatCents(s.net_cents)} (${formatCents(s.income_cents)} in, ${formatCents(s.expense_cents)} out).`,
    `Open fines: ${s.open_fines} totaling ${formatCents(s.open_fines_cents)}.`,
    ``,
    `Highlights:`,
    `  · `,
    `  · `,
    ``,
    `Challenges:`,
    `  · `,
    ``,
    `Recommendations to the Board:`,
    `  · `,
  ].join("\n");
}

function defaultBodyHtml(s: StateReportSnapshot): string {
  return `
    <h2>State of the Fraternity · ${currentSemester()}</h2>
    <h3>Snapshot</h3>
    <ul>
      <li><strong>Membership:</strong> ${s.active_brothers} active, ${s.pledges} pledges, ${s.alumni} alumni</li>
      <li><strong>Meetings held:</strong> ${s.meetings_held}</li>
      <li><strong>Dues:</strong> ${formatCents(s.dues_collected_cents)} collected · ${formatCents(s.dues_outstanding_cents)} outstanding</li>
      <li><strong>Net cash flow:</strong> ${s.net_cents >= 0 ? "+" : ""}${formatCents(s.net_cents)}</li>
      <li><strong>Open fines:</strong> ${s.open_fines} totaling ${formatCents(s.open_fines_cents)}</li>
    </ul>
    <h3>Highlights</h3>
    <p>…</p>
    <h3>Challenges</h3>
    <p>…</p>
    <h3>Recommendations to the Board</h3>
    <p>…</p>
  `.trim();
}
