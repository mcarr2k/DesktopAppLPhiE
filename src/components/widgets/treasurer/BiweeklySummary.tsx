import { useMemo, useState } from "react";
import { Copy, FileText } from "lucide-react";
import { Widget } from "@/components/shell/Widget";
import { Button } from "@/components/ui/Button";
import { toast } from "@/components/ui/Toast";
import { useTransactions } from "@/hooks/useTransactions";
import { useDues } from "@/hooks/useDues";
import { useFines } from "@/hooks/useFines";
import { formatCents } from "@/lib/format";
import { currentSemester } from "@/lib/dates";
import { format, subDays } from "date-fns";

interface Props {
  colSpan?: 4 | 6 | 8 | 12;
}

const PERIOD_DAYS = 14;

export function BiweeklySummary({ colSpan = 6 }: Props) {
  const semester = currentSemester();
  const { transactions } = useTransactions();
  const { dues } = useDues();
  const { fines } = useFines();

  const [copied, setCopied] = useState(false);

  const summary = useMemo(() => {
    const since = subDays(new Date(), PERIOD_DAYS);
    const recent = transactions.filter((t) => new Date(t.occurred_on) >= since);

    const income = recent
      .filter((t) => t.kind === "income")
      .reduce((s, t) => s + t.amount_cents, 0);
    const expense = recent
      .filter((t) => t.kind === "expense")
      .reduce((s, t) => s + t.amount_cents, 0);

    // Top 3 expenses in the window
    const topExpenses = recent
      .filter((t) => t.kind === "expense")
      .sort((a, b) => b.amount_cents - a.amount_cents)
      .slice(0, 3);

    // Dues collection
    const semDues = dues.filter((d) => d.semester === semester);
    const owed = semDues.reduce((s, d) => s + d.amount_owed_cents, 0);
    const paid = semDues.reduce((s, d) => s + d.amount_paid_cents, 0);
    const collectedPct = owed === 0 ? 0 : Math.round((paid / owed) * 100);
    const delinquent = semDues.filter(
      (d) => d.status === "unpaid" || d.status === "partial"
    ).length;

    // Outstanding fines
    const openFines = fines.filter(
      (f) => f.status === "pending" || f.status === "approved"
    );
    const openFinesTotal = openFines.reduce(
      (s, f) => s + f.amount_cents,
      0
    );

    return {
      income,
      expense,
      net: income - expense,
      topExpenses,
      semester,
      collectedPct,
      owed,
      paid,
      delinquent,
      openFinesCount: openFines.length,
      openFinesTotal,
      since,
    };
  }, [transactions, dues, fines, semester]);

  const reportText = useMemo(() => {
    const lines: string[] = [];
    lines.push(
      `Biweekly Financial Update — ${format(summary.since, "MMM d")} to ${format(new Date(), "MMM d, yyyy")}`
    );
    lines.push(``);
    lines.push(`Net change: ${summary.net >= 0 ? "+" : ""}${formatCents(summary.net)}`);
    lines.push(`  · Income:  ${formatCents(summary.income)}`);
    lines.push(`  · Expense: ${formatCents(summary.expense)}`);
    lines.push(``);
    if (summary.topExpenses.length > 0) {
      lines.push(`Top expenses:`);
      summary.topExpenses.forEach((t) => {
        lines.push(
          `  · ${formatCents(t.amount_cents)} — ${t.category ?? "Uncategorized"}${
            t.memo ? ` (${t.memo})` : ""
          }`
        );
      });
      lines.push(``);
    }
    lines.push(`Dues (${summary.semester}):`);
    lines.push(
      `  · Collected ${formatCents(summary.paid)} of ${formatCents(summary.owed)} (${summary.collectedPct}%)`
    );
    lines.push(`  · ${summary.delinquent} brother(s) outstanding`);
    lines.push(``);
    lines.push(`Open fines: ${summary.openFinesCount} totaling ${formatCents(summary.openFinesTotal)}`);
    return lines.join("\n");
  }, [summary]);

  async function copyToClipboard() {
    try {
      await navigator.clipboard.writeText(reportText);
      setCopied(true);
      toast.success("Report copied to clipboard.");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy to clipboard.");
    }
  }

  return (
    <Widget
      title="Biweekly financial update"
      subtitle="Auto-generated from the ledger · ready to read at the next chapter meeting"
      colSpan={colSpan}
      actions={
        <Button size="sm" variant="secondary" onClick={copyToClipboard}>
          <Copy size={12} /> {copied ? "Copied" : "Copy"}
        </Button>
      }
    >
      <div className="space-y-4">
        {/* Headline net change */}
        <div className="rounded-xl border border-lphie-ink/5 bg-lphie-cream/40 p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-lphie-ink/60">
            Net change · last {PERIOD_DAYS} days
          </p>
          <p
            className={`mt-1 font-display text-3xl font-bold ${
              summary.net >= 0 ? "text-emerald-700" : "text-rose-700"
            }`}
          >
            {summary.net >= 0 ? "+" : ""}
            {formatCents(summary.net)}
          </p>
          <p className="text-xs text-lphie-ink/60">
            {formatCents(summary.income)} in · {formatCents(summary.expense)} out
          </p>
        </div>

        {/* Plaintext preview */}
        <div className="rounded-xl border border-lphie-ink/10 bg-white p-3">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-lphie-ink/60">
            <FileText size={12} /> Report preview
          </div>
          <pre className="max-h-72 overflow-auto whitespace-pre-wrap font-mono text-xs leading-relaxed text-lphie-ink/80">
            {reportText}
          </pre>
        </div>
      </div>
    </Widget>
  );
}
