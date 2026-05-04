import { useMemo, useState } from "react";
import { ArrowDownRight, ArrowUpRight, Plus, Trash2 } from "lucide-react";
import { Widget } from "@/components/shell/Widget";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { toast } from "@/components/ui/Toast";
import { Spinner } from "@/components/ui/Spinner";
import { useTransactions } from "@/hooks/useTransactions";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { formatCents, parseDollarsToCents } from "@/lib/format";
import { formatDate } from "@/lib/dates";
import type { TransactionKind } from "@/types/db";

const COMMON_CATEGORIES = [
  "Dues",
  "Fundraising",
  "Philanthropy",
  "Mixers",
  "Formal",
  "Operations",
  "Merch",
  "Travel",
  "Awards",
  "Refund",
  "Other",
];

export function Ledger({ colSpan = 8 }: { colSpan?: 4 | 6 | 8 | 12 }) {
  const { transactions, loading } = useTransactions();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<"all" | "income" | "expense">("all");

  const filtered = useMemo(() => {
    if (filter === "all") return transactions;
    return transactions.filter((t) => t.kind === filter);
  }, [transactions, filter]);

  return (
    <Widget
      title="Ledger"
      subtitle="All chapter transactions"
      colSpan={colSpan}
      actions={
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-lg border border-lphie-ink/10 bg-white p-0.5 text-xs">
            {(["all", "income", "expense"] as const).map((opt) => (
              <button
                key={opt}
                onClick={() => setFilter(opt)}
                className={`rounded-md px-2 py-1 font-semibold transition-colors ${
                  filter === opt
                    ? "bg-lphie-gold text-lphie-ink"
                    : "text-lphie-ink/60 hover:bg-lphie-ink/5"
                }`}
              >
                {opt[0].toUpperCase() + opt.slice(1)}
              </button>
            ))}
          </div>
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus size={14} /> Add
          </Button>
        </div>
      }
    >
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Spinner />
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-lphie-ink/50">
          No transactions yet. Click Add to log one.
        </p>
      ) : (
        <div className="max-h-96 overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-white text-left text-xs uppercase tracking-wider text-lphie-ink/60">
              <tr>
                <th className="py-2">Date</th>
                <th className="py-2">Memo</th>
                <th className="py-2">Category</th>
                <th className="py-2 text-right">Amount</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <Row key={t.id} t={t} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AddTransactionModal open={open} onClose={() => setOpen(false)} />
    </Widget>
  );
}

function Row({
  t,
}: {
  t: {
    id: string;
    kind: TransactionKind;
    amount_cents: number;
    category: string | null;
    memo: string | null;
    occurred_on: string;
  };
}) {
  const [busy, setBusy] = useState(false);
  async function remove() {
    if (!confirm("Delete this transaction?")) return;
    setBusy(true);
    const { error } = await supabase.from("transactions").delete().eq("id", t.id);
    setBusy(false);
    if (error) toast.error(error.message);
  }
  return (
    <tr className="border-t border-lphie-ink/5">
      <td className="py-2 font-mono text-xs text-lphie-ink/70">
        {formatDate(t.occurred_on)}
      </td>
      <td className="py-2">
        <span className="inline-flex items-center gap-1.5">
          {t.kind === "income" ? (
            <ArrowDownRight size={14} className="text-emerald-600" />
          ) : (
            <ArrowUpRight size={14} className="text-rose-600" />
          )}
          {t.memo ?? <span className="text-lphie-ink/40">—</span>}
        </span>
      </td>
      <td className="py-2 text-lphie-ink/70">{t.category ?? "—"}</td>
      <td
        className={`py-2 text-right font-semibold ${
          t.kind === "income" ? "text-emerald-700" : "text-rose-700"
        }`}
      >
        {t.kind === "income" ? "+" : "−"}
        {formatCents(t.amount_cents)}
      </td>
      <td className="py-2 text-right">
        <button
          onClick={remove}
          disabled={busy}
          className="rounded p-1 text-lphie-ink/40 hover:bg-rose-50 hover:text-rose-700 disabled:opacity-50"
          aria-label="Delete"
        >
          <Trash2 size={14} />
        </button>
      </td>
    </tr>
  );
}

function AddTransactionModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const [kind, setKind] = useState<TransactionKind>("income");
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [category, setCategory] = useState("");
  const [occurredOn, setOccurredOn] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit() {
    if (!user) return;
    const cents = parseDollarsToCents(amount);
    if (!cents || cents <= 0) {
      toast.error("Enter an amount in dollars (e.g. 125.00).");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("transactions").insert({
      kind,
      amount_cents: cents,
      memo: memo || null,
      category: category || null,
      occurred_on: occurredOn,
      recorded_by: user.id,
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Transaction logged.");
    setAmount("");
    setMemo("");
    setCategory("");
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Log transaction"
      width="md"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onSubmit} isLoading={submitting}>
            Save
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <fieldset>
          <legend className="mb-1 block text-xs font-semibold uppercase tracking-wider text-lphie-ink/70">
            Kind
          </legend>
          <div className="inline-flex rounded-lg border border-lphie-ink/10 bg-white p-0.5">
            {(["income", "expense"] as const).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setKind(k)}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                  kind === k
                    ? k === "income"
                      ? "bg-emerald-600 text-white"
                      : "bg-rose-600 text-white"
                    : "text-lphie-ink/60 hover:bg-lphie-ink/5"
                }`}
              >
                {k === "income" ? "Income" : "Expense"}
              </button>
            ))}
          </div>
        </fieldset>
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Amount (USD)"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="125.00"
            inputMode="decimal"
          />
          <Input
            label="Date"
            type="date"
            value={occurredOn}
            onChange={(e) => setOccurredOn(e.target.value)}
          />
        </div>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-lphie-ink/70">
            Category
          </span>
          <select
            className="h-10 w-full rounded-lg border border-lphie-ink/15 bg-white px-3 text-sm focus:border-lphie-gold focus:outline-none focus:ring-2 focus:ring-lphie-gold/30"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">— pick category —</option>
            {COMMON_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <Textarea
          label="Memo"
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          rows={2}
          placeholder="What's this for?"
        />
      </div>
    </Modal>
  );
}
