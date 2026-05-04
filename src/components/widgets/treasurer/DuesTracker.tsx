import { useMemo, useState } from "react";
import { CreditCard, Plus, Calendar as CalIcon, Check, Trash2 } from "lucide-react";
import { Widget } from "@/components/shell/Widget";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { toast } from "@/components/ui/Toast";
import { useDirectory } from "@/hooks/useDirectory";
import { useDues } from "@/hooks/useDues";
import { supabase } from "@/lib/supabase";
import { formatCents, parseDollarsToCents } from "@/lib/format";
import { currentSemester, formatDate } from "@/lib/dates";
import type { Dues, DuesInstallment, DuesStatus } from "@/types/db";

const STATUS_TONE: Record<DuesStatus, "neutral" | "gold" | "success" | "danger"> = {
  paid: "success",
  partial: "gold",
  unpaid: "danger",
  waived: "neutral",
};

export function DuesTracker({ colSpan = 12 }: { colSpan?: 4 | 6 | 8 | 12 }) {
  const { members } = useDirectory();
  const { dues, installmentsFor, loading } = useDues();
  const [createOpen, setCreateOpen] = useState(false);
  const [planFor, setPlanFor] = useState<Dues | null>(null);

  const semester = currentSemester();
  const currentSemesterDues = useMemo(
    () => dues.filter((d) => d.semester === semester),
    [dues, semester]
  );

  const totals = useMemo(() => {
    let owed = 0;
    let paid = 0;
    currentSemesterDues.forEach((d) => {
      owed += d.amount_owed_cents;
      paid += d.amount_paid_cents;
    });
    return { owed, paid, outstanding: owed - paid };
  }, [currentSemesterDues]);

  const activeMembers = members.filter(
    (m) => m.status === "active" || m.status === "pledge"
  );

  return (
    <Widget
      title="Dues tracker"
      subtitle={`${semester} · ${formatCents(totals.paid)} of ${formatCents(totals.owed)} collected`}
      colSpan={colSpan}
      actions={
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus size={14} /> New dues run
        </Button>
      }
    >
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Spinner />
        </div>
      ) : (
        <>
          <div className="mb-4 grid grid-cols-3 gap-3 text-sm">
            <Stat label="Total owed" value={formatCents(totals.owed)} />
            <Stat label="Collected" value={formatCents(totals.paid)} />
            <Stat
              label="Outstanding"
              value={formatCents(totals.outstanding)}
              tone={totals.outstanding === 0 ? "success" : "danger"}
            />
          </div>

          {currentSemesterDues.length === 0 ? (
            <div className="rounded-xl border border-dashed border-lphie-ink/15 bg-lphie-cream/40 p-6 text-center text-sm text-lphie-ink/60">
              No dues records yet for {semester}. Click "New dues run" to draft
              dues for every active brother.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-lphie-ink/5">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="bg-lphie-cream text-left text-xs uppercase tracking-wider text-lphie-ink/60">
                  <tr>
                    <th className="px-3 py-2">Brother</th>
                    <th className="px-3 py-2">Owed</th>
                    <th className="px-3 py-2">Paid</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Plan</th>
                    <th className="px-3 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {currentSemesterDues.map((d) => {
                    const member = members.find((m) => m.id === d.brother_id);
                    const installs = installmentsFor(d.id);
                    return (
                      <tr key={d.id} className="border-t border-lphie-ink/5">
                        <td className="px-3 py-2 font-semibold">
                          {member?.full_name ?? "—"}
                        </td>
                        <td className="px-3 py-2">
                          {formatCents(d.amount_owed_cents)}
                        </td>
                        <td className="px-3 py-2 text-emerald-700">
                          {formatCents(d.amount_paid_cents)}
                        </td>
                        <td className="px-3 py-2">
                          <Badge tone={STATUS_TONE[d.status]}>{d.status}</Badge>
                        </td>
                        <td className="px-3 py-2 text-xs text-lphie-ink/60">
                          {installs.length > 0
                            ? `${installs.filter((i) => i.paid_on).length} / ${installs.length} paid`
                            : "single"}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setPlanFor(d)}
                          >
                            <CreditCard size={14} /> Plan
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      <CreateDuesModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        members={activeMembers}
        existingBrotherIds={new Set(currentSemesterDues.map((d) => d.brother_id))}
      />

      <PaymentPlanModal
        dues={planFor}
        installments={planFor ? installmentsFor(planFor.id) : []}
        onClose={() => setPlanFor(null)}
      />
    </Widget>
  );
}

function Stat({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "success" | "danger";
}) {
  const colors = {
    neutral: "text-lphie-ink",
    success: "text-emerald-700",
    danger: "text-rose-700",
  };
  return (
    <div className="rounded-xl border border-lphie-ink/5 bg-lphie-cream/50 px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-lphie-ink/50">
        {label}
      </p>
      <p className={`mt-0.5 font-display text-lg font-bold ${colors[tone]}`}>
        {value}
      </p>
    </div>
  );
}

function CreateDuesModal({
  open,
  onClose,
  members,
  existingBrotherIds,
}: {
  open: boolean;
  onClose: () => void;
  members: ReturnType<typeof useDirectory>["members"];
  existingBrotherIds: Set<string>;
}) {
  const [amount, setAmount] = useState("250.00");
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    return d.toISOString().slice(0, 10);
  });
  const [submitting, setSubmitting] = useState(false);

  async function run() {
    const cents = parseDollarsToCents(amount);
    if (!cents || cents <= 0) {
      toast.error("Enter an amount per brother (e.g. 250.00).");
      return;
    }
    const targets = members.filter((m) => !existingBrotherIds.has(m.id));
    if (targets.length === 0) {
      toast.info("Every active brother already has dues for this semester.");
      onClose();
      return;
    }
    setSubmitting(true);
    const semester = currentSemester();
    const rows = targets.map((m) => ({
      brother_id: m.id,
      semester,
      amount_owed_cents: cents,
      due_date: dueDate || null,
    }));
    const { error } = await supabase
      .from("dues")
      .upsert(rows, { onConflict: "brother_id,semester" });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(
      `Drafted ${targets.length} dues record${targets.length === 1 ? "" : "s"} for ${semester}.`
    );
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`New dues run · ${currentSemester()}`}
      width="sm"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={run} isLoading={submitting}>
            Draft for active brothers
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-lphie-ink/70">
          Creates one <code>unpaid</code> dues record per active brother who
          doesn't already have one this semester. You can configure payment
          plans per brother afterward.
        </p>
        <Input
          label="Amount per brother (USD)"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          inputMode="decimal"
        />
        <Input
          label="Default due date"
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
        />
      </div>
    </Modal>
  );
}

function PaymentPlanModal({
  dues,
  installments,
  onClose,
}: {
  dues: Dues | null;
  installments: DuesInstallment[];
  onClose: () => void;
}) {
  const [splitCount, setSplitCount] = useState(2);
  const [submitting, setSubmitting] = useState(false);
  const [newAmount, setNewAmount] = useState("");
  const [newDueDate, setNewDueDate] = useState("");

  if (!dues) return null;

  const installmentsTotal = installments.reduce(
    (sum, i) => sum + i.amount_cents,
    0
  );
  const remaining = dues.amount_owed_cents - installmentsTotal;

  async function autoSplit() {
    if (splitCount < 2) {
      toast.error("Split into at least 2 installments.");
      return;
    }
    if (installments.length > 0) {
      if (!confirm("This replaces the existing payment plan. Continue?"))
        return;
      const ids = installments.map((i) => i.id);
      const { error: delErr } = await supabase
        .from("dues_installments")
        .delete()
        .in("id", ids);
      if (delErr) {
        toast.error(delErr.message);
        return;
      }
    }
    const each = Math.floor(dues!.amount_owed_cents / splitCount);
    const remainder = dues!.amount_owed_cents - each * splitCount;
    setSubmitting(true);
    const start = new Date();
    const rows = Array.from({ length: splitCount }, (_, i) => {
      const dt = new Date(start);
      dt.setMonth(dt.getMonth() + i);
      return {
        dues_id: dues!.id,
        amount_cents: i === splitCount - 1 ? each + remainder : each,
        due_date: dt.toISOString().slice(0, 10),
      };
    });
    const { error } = await supabase.from("dues_installments").insert(rows);
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Split into ${splitCount} installments.`);
  }

  async function addCustom() {
    const cents = parseDollarsToCents(newAmount);
    if (!cents || cents <= 0) {
      toast.error("Enter an amount.");
      return;
    }
    if (!newDueDate) {
      toast.error("Pick a due date.");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("dues_installments").insert({
      dues_id: dues!.id,
      amount_cents: cents,
      due_date: newDueDate,
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setNewAmount("");
    setNewDueDate("");
    toast.success("Installment added.");
  }

  async function markPaid(inst: DuesInstallment) {
    const today = new Date().toISOString().slice(0, 10);
    const { error } = await supabase
      .from("dues_installments")
      .update({
        paid_on: today,
        paid_amount_cents: inst.amount_cents,
      })
      .eq("id", inst.id);
    if (error) toast.error(error.message);
    else toast.success("Marked paid.");
  }

  async function unmarkPaid(inst: DuesInstallment) {
    const { error } = await supabase
      .from("dues_installments")
      .update({ paid_on: null, paid_amount_cents: null })
      .eq("id", inst.id);
    if (error) toast.error(error.message);
  }

  async function deleteInstallment(inst: DuesInstallment) {
    if (!confirm("Remove this installment?")) return;
    const { error } = await supabase
      .from("dues_installments")
      .delete()
      .eq("id", inst.id);
    if (error) toast.error(error.message);
  }

  async function waive() {
    if (!confirm("Waive these dues? This will remove all installments.")) return;
    const ids = installments.map((i) => i.id);
    if (ids.length) {
      await supabase.from("dues_installments").delete().in("id", ids);
    }
    const { error } = await supabase
      .from("dues")
      .update({ status: "waived", amount_paid_cents: 0 })
      .eq("id", dues!.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Dues waived.");
      onClose();
    }
  }

  return (
    <Modal
      open={!!dues}
      onClose={onClose}
      title="Payment plan"
      width="lg"
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button variant="danger" size="sm" onClick={waive}>
            Waive dues
          </Button>
          <Button variant="ghost" onClick={onClose}>
            Done
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        <div className="grid grid-cols-3 gap-3 text-sm">
          <Stat label="Owed" value={formatCents(dues.amount_owed_cents)} />
          <Stat
            label="Paid"
            value={formatCents(dues.amount_paid_cents)}
            tone="success"
          />
          <Stat
            label="Remaining"
            value={formatCents(
              dues.amount_owed_cents - dues.amount_paid_cents
            )}
            tone={
              dues.amount_owed_cents - dues.amount_paid_cents === 0
                ? "success"
                : "danger"
            }
          />
        </div>

        {installments.length === 0 && (
          <div className="rounded-xl border border-dashed border-lphie-ink/15 bg-lphie-cream/40 p-4 text-sm">
            <p className="mb-2 font-semibold">No payment plan yet</p>
            <p className="mb-3 text-lphie-ink/70">
              Auto-split into equal monthly installments, or add custom
              installments below.
            </p>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={2}
                max={12}
                value={splitCount}
                onChange={(e) => setSplitCount(Number(e.target.value))}
                className="h-10 w-20 rounded-lg border border-lphie-ink/15 bg-white px-3 text-sm focus:border-lphie-gold focus:outline-none focus:ring-2 focus:ring-lphie-gold/30"
              />
              <span className="text-sm text-lphie-ink/70">
                installments, monthly
              </span>
              <Button size="sm" onClick={autoSplit} isLoading={submitting}>
                Auto-split
              </Button>
            </div>
          </div>
        )}

        {installments.length > 0 && (
          <div>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-lphie-ink/60">
              Schedule
            </h4>
            <ul className="overflow-hidden rounded-xl border border-lphie-ink/5">
              {installments.map((i) => (
                <li
                  key={i.id}
                  className="flex items-center justify-between border-b border-lphie-ink/5 bg-white px-3 py-2 text-sm last:border-b-0"
                >
                  <div className="flex items-center gap-3">
                    <CalIcon
                      size={14}
                      className={
                        i.paid_on ? "text-emerald-600" : "text-lphie-ink/40"
                      }
                    />
                    <div>
                      <p className="font-medium">
                        {formatCents(i.amount_cents)}
                      </p>
                      <p className="text-xs text-lphie-ink/60">
                        {i.paid_on
                          ? `paid ${formatDate(i.paid_on)}`
                          : `due ${formatDate(i.due_date)}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {i.paid_on ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => unmarkPaid(i)}
                      >
                        Undo
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => markPaid(i)}
                      >
                        <Check size={14} /> Mark paid
                      </Button>
                    )}
                    <button
                      onClick={() => deleteInstallment(i)}
                      className="rounded p-1 text-lphie-ink/40 hover:bg-rose-50 hover:text-rose-700"
                      aria-label="Remove"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            {remaining !== 0 && (
              <p className="mt-2 text-xs text-amber-700">
                Installments total {formatCents(installmentsTotal)} but dues
                are {formatCents(dues.amount_owed_cents)} ({formatCents(
                  remaining
                )}{" "}
                {remaining > 0 ? "missing" : "extra"}).
              </p>
            )}
          </div>
        )}

        <div className="border-t border-lphie-ink/5 pt-4">
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-lphie-ink/60">
            Add custom installment
          </h4>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <Input
              label="Amount"
              value={newAmount}
              onChange={(e) => setNewAmount(e.target.value)}
              placeholder="50.00"
              inputMode="decimal"
            />
            <Input
              label="Due"
              type="date"
              value={newDueDate}
              onChange={(e) => setNewDueDate(e.target.value)}
            />
            <div className="col-span-2 flex items-end sm:col-span-1">
              <Button
                size="md"
                className="w-full"
                onClick={addCustom}
                isLoading={submitting}
              >
                <Plus size={14} /> Add
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}

