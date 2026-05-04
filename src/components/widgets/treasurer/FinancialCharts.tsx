import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { format, parseISO, startOfMonth, subMonths } from "date-fns";
import { Widget } from "@/components/shell/Widget";
import { useTransactions } from "@/hooks/useTransactions";
import { useDues } from "@/hooks/useDues";
import { formatCents } from "@/lib/format";

const PALETTE = {
  income: "#0E7490",
  expense: "#7A1F1F",
  paid: "#10B981",
  partial: "#F59E0B",
  unpaid: "#EF4444",
  waived: "#6B7280",
};

export function FinancialCharts() {
  const { transactions } = useTransactions();
  const { dues } = useDues();

  // ---------- Last 6 months income vs expense ----------
  const monthlyData = useMemo(() => {
    const now = startOfMonth(new Date());
    const buckets = Array.from({ length: 6 }, (_, i) => {
      const m = subMonths(now, 5 - i);
      return {
        key: format(m, "yyyy-MM"),
        label: format(m, "MMM"),
        income: 0,
        expense: 0,
      };
    });
    transactions.forEach((t) => {
      const dt = parseISO(t.occurred_on);
      const key = format(dt, "yyyy-MM");
      const bucket = buckets.find((b) => b.key === key);
      if (bucket) {
        if (t.kind === "income") bucket.income += t.amount_cents / 100;
        else bucket.expense += t.amount_cents / 100;
      }
    });
    return buckets;
  }, [transactions]);

  // ---------- Dues collection breakdown ----------
  const duesData = useMemo(() => {
    const counts = { paid: 0, partial: 0, unpaid: 0, waived: 0 };
    dues.forEach((d) => {
      counts[d.status] += 1;
    });
    return [
      { name: "Paid in full", value: counts.paid, fill: PALETTE.paid },
      { name: "Partial", value: counts.partial, fill: PALETTE.partial },
      { name: "Unpaid", value: counts.unpaid, fill: PALETTE.unpaid },
      { name: "Waived", value: counts.waived, fill: PALETTE.waived },
    ].filter((s) => s.value > 0);
  }, [dues]);

  const totals = useMemo(() => {
    let inc = 0;
    let exp = 0;
    transactions.forEach((t) => {
      if (t.kind === "income") inc += t.amount_cents;
      else exp += t.amount_cents;
    });
    return { income: inc, expense: exp, net: inc - exp };
  }, [transactions]);

  return (
    <>
      <Widget title="Cashflow" subtitle="Last 6 months" colSpan={8}>
        <div className="mb-4 grid grid-cols-3 gap-3 text-sm">
          <Stat label="Income (lifetime)" value={formatCents(totals.income)} tone="income" />
          <Stat label="Expense (lifetime)" value={formatCents(totals.expense)} tone="expense" />
          <Stat
            label="Net"
            value={formatCents(totals.net)}
            tone={totals.net >= 0 ? "income" : "expense"}
          />
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(10,10,10,0.08)" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="#666" />
              <YAxis
                tick={{ fontSize: 12 }}
                stroke="#666"
                tickFormatter={(v) => `$${v}`}
              />
              <Tooltip
                formatter={(v: number) => `$${v.toFixed(2)}`}
                contentStyle={{
                  borderRadius: 8,
                  border: "1px solid rgba(10,10,10,0.1)",
                  fontSize: 12,
                }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="income" fill={PALETTE.income} name="Income" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expense" fill={PALETTE.expense} name="Expense" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Widget>

      <Widget
        title="Dues collection"
        subtitle={`${dues.length} brother${dues.length === 1 ? "" : "s"} this semester`}
        colSpan={4}
      >
        {duesData.length === 0 ? (
          <p className="text-sm text-lphie-ink/50">
            No dues records yet. Create some from the Dues Tracker.
          </p>
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={duesData}
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                  nameKey="name"
                >
                  {duesData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    borderRadius: 8,
                    border: "1px solid rgba(10,10,10,0.1)",
                    fontSize: 12,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </Widget>
    </>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "income" | "expense";
}) {
  return (
    <div className="rounded-xl border border-lphie-ink/5 bg-lphie-cream/50 px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-lphie-ink/50">
        {label}
      </p>
      <p
        className="mt-0.5 font-display text-lg font-bold"
        style={{ color: tone === "income" ? PALETTE.income : PALETTE.expense }}
      >
        {value}
      </p>
    </div>
  );
}
