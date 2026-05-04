import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { Widget } from "@/components/shell/Widget";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { toast } from "@/components/ui/Toast";
import { useFines } from "@/hooks/useFines";
import { useDirectory } from "@/hooks/useDirectory";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { formatCents, parseDollarsToCents } from "@/lib/format";
import { formatDate } from "@/lib/dates";
import type { FineStatus } from "@/types/db";

const TONE: Record<FineStatus, "neutral" | "gold" | "success" | "danger"> = {
  pending: "gold",
  approved: "neutral",
  paid: "success",
  waived: "neutral",
};

const COMMON_REASONS = [
  "Missed weekly meeting (no excuse)",
  "Late to weekly meeting",
  "Missed mandatory event",
  "Failed to complete assigned committee work",
  "Missed dues installment",
];

export function FinesLog({ colSpan = 6 }: { colSpan?: 4 | 6 | 8 | 12 }) {
  const { fines, loading } = useFines();
  const { members } = useDirectory();
  const [open, setOpen] = useState(false);

  const recent = useMemo(() => fines.slice(0, 12), [fines]);

  return (
    <Widget
      title="Fines log"
      subtitle="Issue fines; Treasurer collects them"
      colSpan={colSpan}
      actions={
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus size={14} /> Issue fine
        </Button>
      }
    >
      {loading ? (
        <div className="flex items-center justify-center py-6">
          <Spinner />
        </div>
      ) : recent.length === 0 ? (
        <p className="text-sm text-lphie-ink/50">
          No fines on record. Click "Issue fine" to log one.
        </p>
      ) : (
        <ul className="max-h-72 divide-y divide-lphie-ink/5 overflow-auto">
          {recent.map((f) => {
            const brother = members.find((m) => m.id === f.brother_id);
            return (
              <li
                key={f.id}
                className="flex items-start justify-between py-2.5 text-sm"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">
                      {brother?.full_name ?? "—"}
                    </p>
                    <Badge tone={TONE[f.status]}>{f.status}</Badge>
                  </div>
                  <p className="text-xs text-lphie-ink/70">{f.reason}</p>
                  <p className="mt-0.5 text-[11px] text-lphie-ink/50">
                    {formatDate(f.issued_at)}
                  </p>
                </div>
                <p className="font-semibold text-lphie-ink/80">
                  {formatCents(f.amount_cents)}
                </p>
              </li>
            );
          })}
        </ul>
      )}

      <IssueFineModal open={open} onClose={() => setOpen(false)} />
    </Widget>
  );
}

function IssueFineModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const { members } = useDirectory();
  const [brotherId, setBrotherId] = useState("");
  const [amount, setAmount] = useState("10.00");
  const [reason, setReason] = useState(COMMON_REASONS[0]);
  const [customReason, setCustomReason] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const eligible = useMemo(
    () =>
      members.filter(
        (m) => m.status === "active" || m.status === "pledge"
      ),
    [members]
  );

  async function submit() {
    if (!user) return;
    if (!brotherId) {
      toast.error("Pick a brother.");
      return;
    }
    const cents = parseDollarsToCents(amount);
    if (!cents || cents <= 0) {
      toast.error("Enter an amount.");
      return;
    }
    const finalReason = reason === "Other" ? customReason.trim() : reason;
    if (!finalReason) {
      toast.error("Provide a reason.");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("fines").insert({
      brother_id: brotherId,
      amount_cents: cents,
      reason: finalReason,
      notes: notes || null,
      issued_by: user.id,
      status: "pending",
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Fine queued for the Treasurer.");
    setBrotherId("");
    setAmount("10.00");
    setReason(COMMON_REASONS[0]);
    setCustomReason("");
    setNotes("");
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Issue fine"
      width="md"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} isLoading={submitting}>
            Log fine
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-lphie-ink/70">
            Brother
          </span>
          <select
            className="h-10 w-full rounded-lg border border-lphie-ink/15 bg-white px-3 text-sm focus:border-lphie-gold focus:outline-none focus:ring-2 focus:ring-lphie-gold/30"
            value={brotherId}
            onChange={(e) => setBrotherId(e.target.value)}
          >
            <option value="">— select brother —</option>
            {eligible.map((m) => (
              <option key={m.id} value={m.id}>
                {m.full_name}
              </option>
            ))}
          </select>
        </label>

        <Input
          label="Amount (USD)"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          inputMode="decimal"
        />

        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-lphie-ink/70">
            Reason
          </span>
          <select
            className="h-10 w-full rounded-lg border border-lphie-ink/15 bg-white px-3 text-sm focus:border-lphie-gold focus:outline-none focus:ring-2 focus:ring-lphie-gold/30"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          >
            {COMMON_REASONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
            <option value="Other">Other (specify)</option>
          </select>
        </label>

        {reason === "Other" && (
          <Input
            label="Custom reason"
            value={customReason}
            onChange={(e) => setCustomReason(e.target.value)}
            placeholder="Specify"
          />
        )}

        <Textarea
          label="Notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="Optional"
        />
      </div>
    </Modal>
  );
}
