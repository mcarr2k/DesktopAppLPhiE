import { useMemo, useState, type FormEvent } from "react";
import { Plus, Trash2, AlertTriangle } from "lucide-react";
import { Widget } from "@/components/shell/Widget";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Spinner } from "@/components/ui/Spinner";
import { Badge } from "@/components/ui/Badge";
import { toast } from "@/components/ui/Toast";
import { useBudget } from "@/hooks/useBudget";
import { useTransactions } from "@/hooks/useTransactions";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { formatCents, parseDollarsToCents } from "@/lib/format";
import { currentSemester } from "@/lib/dates";
import type { BudgetItem, BudgetKind } from "@/types/db";

interface Props {
  colSpan?: 4 | 6 | 8 | 12;
}

const INCOME_DEFAULTS = [
  "Dues",
  "Alumni donations",
  "Fundraising",
  "Merch sales",
  "Other income",
];

const EXPENSE_DEFAULTS = [
  "National dues",
  "Operations",
  "Mixers",
  "Philanthropy",
  "Formal",
  "Merch production",
  "Awards",
  "Travel",
  "Other expense",
];

export function BudgetBuilder({ colSpan = 12 }: Props) {
  const [semester, setSemester] = useState(currentSemester());
  const { items, loading, error, refetch } = useBudget(semester);
  const { transactions } = useTransactions();
  const { user, role } = useAuth();
  const canEdit = role === "treasurer" || role === "president";

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<BudgetItem | null>(null);

  // "Actual to date" pulled from the live ledger so the budget stays
  // self-correcting without the Treasurer having to dual-enter values.
  const actualByCategory = useMemo(() => {
    const map = new Map<string, { income: number; expense: number }>();
    for (const t of transactions) {
      const cat = (t.category ?? "Other").trim();
      const cur = map.get(cat) ?? { income: 0, expense: 0 };
      if (t.kind === "income") cur.income += t.amount_cents;
      else cur.expense += t.amount_cents;
      map.set(cat, cur);
    }
    return map;
  }, [transactions]);

  const income = items.filter((i) => i.kind === "income");
  const expense = items.filter((i) => i.kind === "expense");

  const totals = useMemo(() => {
    const inc = income.reduce((s, i) => s + i.projected_cents, 0);
    const exp = expense.reduce((s, i) => s + i.projected_cents, 0);
    const incActual = income.reduce(
      (s, i) =>
        s + (actualByCategory.get(i.category)?.income ?? i.actual_cents),
      0
    );
    const expActual = expense.reduce(
      (s, i) =>
        s + (actualByCategory.get(i.category)?.expense ?? i.actual_cents),
      0
    );
    return {
      projectedNet: inc - exp,
      actualNet: incActual - expActual,
      incomeProjected: inc,
      expenseProjected: exp,
      incomeActual: incActual,
      expenseActual: expActual,
    };
  }, [income, expense, actualByCategory]);

  const dbMissing = !!error && /relation .*budget_items.* does not exist/i.test(error);

  function openNew(kind: BudgetKind) {
    setEditing({
      id: "",
      semester,
      kind,
      category: "",
      memo: null,
      projected_cents: 0,
      actual_cents: 0,
      created_by: user?.id ?? "",
      created_at: "",
      updated_at: "",
    });
    setModalOpen(true);
  }

  function openEdit(item: BudgetItem) {
    setEditing(item);
    setModalOpen(true);
  }

  async function deleteItem(id: string) {
    if (!confirm("Delete this line item?")) return;
    const { error } = await supabase.from("budget_items").delete().eq("id", id);
    if (error) toast.error(error.message);
    else refetch();
  }

  return (
    <Widget
      title="Budget builder"
      subtitle={`Projected vs. actual · ${semester}`}
      colSpan={colSpan}
      actions={
        <div className="flex items-center gap-2">
          <Input
            value={semester}
            onChange={(e) => setSemester(e.target.value.toUpperCase())}
            className="h-8 w-20 text-xs"
            placeholder="FA25"
          />
        </div>
      }
    >
      {dbMissing ? (
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="mb-1 flex items-center gap-2 font-semibold">
            <AlertTriangle size={14} /> budget_items table not set up yet
          </p>
          <p className="text-xs">
            Re-run <code>supabase/schema.sql</code> followed by{" "}
            <code>supabase/policies.sql</code> in the Supabase SQL editor.
          </p>
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center py-8">
          <Spinner />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Totals strip */}
          <div className="grid grid-cols-3 gap-3">
            <SummaryTile label="Income (proj.)" value={totals.incomeProjected} actual={totals.incomeActual} positive />
            <SummaryTile label="Expense (proj.)" value={totals.expenseProjected} actual={totals.expenseActual} />
            <SummaryTile
              label="Net"
              value={totals.projectedNet}
              actual={totals.actualNet}
              positive={totals.projectedNet >= 0}
              showSign
            />
          </div>

          {/* Income section */}
          <BudgetSection
            kind="income"
            title="Income"
            items={income}
            actualByCategory={actualByCategory}
            canEdit={canEdit}
            onAdd={() => openNew("income")}
            onEdit={openEdit}
            onDelete={deleteItem}
          />

          {/* Expense section */}
          <BudgetSection
            kind="expense"
            title="Expense"
            items={expense}
            actualByCategory={actualByCategory}
            canEdit={canEdit}
            onAdd={() => openNew("expense")}
            onEdit={openEdit}
            onDelete={deleteItem}
          />
        </div>
      )}

      {editing && (
        <BudgetItemModal
          open={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setEditing(null);
          }}
          item={editing}
          onSaved={refetch}
        />
      )}
    </Widget>
  );
}

function SummaryTile({
  label,
  value,
  actual,
  positive,
  showSign,
}: {
  label: string;
  value: number;
  actual: number;
  positive?: boolean;
  showSign?: boolean;
}) {
  const pct = value === 0 ? 0 : Math.round((actual / value) * 100);
  return (
    <div className="rounded-xl border border-lphie-ink/5 bg-lphie-cream/40 p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-lphie-ink/60">
        {label}
      </p>
      <p
        className={`mt-1 font-display text-2xl font-bold ${
          positive ? "text-emerald-700" : "text-lphie-ink"
        }`}
      >
        {showSign && value > 0 && "+"}
        {formatCents(value)}
      </p>
      <p className="mt-0.5 text-xs text-lphie-ink/60">
        Actual: {formatCents(actual)} ({pct}%)
      </p>
    </div>
  );
}

function BudgetSection({
  kind,
  title,
  items,
  actualByCategory,
  canEdit,
  onAdd,
  onEdit,
  onDelete,
}: {
  kind: BudgetKind;
  title: string;
  items: BudgetItem[];
  actualByCategory: Map<string, { income: number; expense: number }>;
  canEdit: boolean;
  onAdd: () => void;
  onEdit: (item: BudgetItem) => void;
  onDelete: (id: string) => void;
}) {
  const accent = kind === "income" ? "text-emerald-700" : "text-rose-700";
  return (
    <section>
      <header className="mb-2 flex items-center justify-between">
        <h4 className={`font-display text-sm font-bold uppercase tracking-wider ${accent}`}>
          {title}
        </h4>
        {canEdit && (
          <Button size="sm" variant="secondary" onClick={onAdd}>
            <Plus size={12} /> Add line
          </Button>
        )}
      </header>
      {items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-lphie-ink/15 bg-white/50 px-3 py-6 text-center text-xs text-lphie-ink/50">
          No {title.toLowerCase()} lines yet.
        </p>
      ) : (
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wider text-lphie-ink/50">
            <tr>
              <th className="px-2 py-1">Category</th>
              <th className="px-2 py-1 text-right">Projected</th>
              <th className="px-2 py-1 text-right">Actual</th>
              <th className="px-2 py-1 text-right">Variance</th>
              <th className="px-2 py-1"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((i) => {
              const liveActual =
                kind === "income"
                  ? actualByCategory.get(i.category)?.income ?? i.actual_cents
                  : actualByCategory.get(i.category)?.expense ?? i.actual_cents;
              const variance = liveActual - i.projected_cents;
              const overrun = kind === "expense" ? variance > 0 : variance < 0;
              return (
                <tr
                  key={i.id}
                  className="border-t border-lphie-ink/5 hover:bg-lphie-cream/40"
                >
                  <td className="px-2 py-2">
                    <p className="font-semibold">{i.category}</p>
                    {i.memo && (
                      <p className="text-xs text-lphie-ink/50">{i.memo}</p>
                    )}
                  </td>
                  <td className="px-2 py-2 text-right tabular-nums">
                    {formatCents(i.projected_cents)}
                  </td>
                  <td className="px-2 py-2 text-right tabular-nums">
                    {formatCents(liveActual)}
                  </td>
                  <td className="px-2 py-2 text-right">
                    <Badge tone={overrun ? "danger" : "success"}>
                      {variance >= 0 ? "+" : ""}
                      {formatCents(variance)}
                    </Badge>
                  </td>
                  <td className="px-2 py-2 text-right">
                    {canEdit && (
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => onEdit(i)}
                          className="rounded px-2 py-1 text-xs font-semibold text-lphie-ink/70 hover:bg-lphie-ink/5"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => onDelete(i.id)}
                          className="rounded p-1 text-lphie-ink/40 hover:bg-rose-50 hover:text-rose-700"
                          aria-label="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </section>
  );
}

function BudgetItemModal({
  open,
  onClose,
  item,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  item: BudgetItem;
  onSaved: () => void;
}) {
  const isNew = !item.id;
  const { user } = useAuth();
  const [category, setCategory] = useState(item.category);
  const [memo, setMemo] = useState(item.memo ?? "");
  const [projected, setProjected] = useState(
    item.projected_cents ? (item.projected_cents / 100).toFixed(2) : ""
  );
  const [submitting, setSubmitting] = useState(false);

  const presets = item.kind === "income" ? INCOME_DEFAULTS : EXPENSE_DEFAULTS;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (!category.trim()) {
      toast.error("Pick or enter a category.");
      return;
    }
    const cents = parseDollarsToCents(projected);
    if (cents === null || cents < 0) {
      toast.error("Enter a valid projected amount.");
      return;
    }
    setSubmitting(true);
    const payload = {
      semester: item.semester,
      kind: item.kind,
      category: category.trim(),
      memo: memo.trim() || null,
      projected_cents: cents,
      created_by: user.id,
    };
    const { error } = isNew
      ? await supabase.from("budget_items").insert(payload)
      : await supabase.from("budget_items").update(payload).eq("id", item.id);
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(isNew ? "Line added." : "Line updated.");
    onSaved();
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isNew ? `New ${item.kind} line` : "Edit budget line"}
      width="md"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button form="budget-form" type="submit" isLoading={submitting}>
            {isNew ? "Add" : "Save"}
          </Button>
        </div>
      }
    >
      <form id="budget-form" onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-lphie-ink/70">
            Category
          </label>
          <input
            list="budget-cats"
            className="h-10 w-full rounded-lg border border-lphie-ink/15 bg-white px-3 text-sm focus:border-lphie-gold focus:outline-none focus:ring-2 focus:ring-lphie-gold/30"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="e.g. Mixers"
          />
          <datalist id="budget-cats">
            {presets.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>
        <Input
          label="Projected amount ($)"
          type="text"
          inputMode="decimal"
          value={projected}
          onChange={(e) => setProjected(e.target.value)}
          placeholder="500.00"
        />
        <Input
          label="Memo"
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          placeholder="Optional context"
        />
      </form>
    </Modal>
  );
}
