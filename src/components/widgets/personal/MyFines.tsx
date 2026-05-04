import { Widget } from "@/components/shell/Widget";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { useFines } from "@/hooks/useFines";
import { useAuth } from "@/hooks/useAuth";
import { formatCents } from "@/lib/format";
import { formatDate } from "@/lib/dates";
import type { FineStatus } from "@/types/db";

const TONE: Record<FineStatus, "neutral" | "gold" | "success" | "danger"> = {
  pending: "gold",
  approved: "danger",
  paid: "success",
  waived: "neutral",
};

export function MyFinesWidget({ colSpan = 6 }: { colSpan?: 4 | 6 | 8 | 12 }) {
  const { user } = useAuth();
  const { fines, loading } = useFines(user?.id);
  const open = fines.filter((f) => f.status !== "paid" && f.status !== "waived");
  const total = open.reduce((s, f) => s + f.amount_cents, 0);

  return (
    <Widget
      title="My fines"
      subtitle={
        open.length === 0
          ? "Clean record"
          : `${formatCents(total)} owed across ${open.length} fine${open.length === 1 ? "" : "s"}`
      }
      colSpan={colSpan}
    >
      {loading ? (
        <div className="flex items-center justify-center py-6">
          <Spinner />
        </div>
      ) : fines.length === 0 ? (
        <p className="text-sm text-lphie-ink/50">No fines. Keep it up.</p>
      ) : (
        <ul className="divide-y divide-lphie-ink/5">
          {fines.slice(0, 6).map((f) => (
            <li key={f.id} className="flex items-start justify-between py-2 text-sm">
              <div className="min-w-0 flex-1">
                <p className="font-medium">{f.reason}</p>
                <p className="text-xs text-lphie-ink/50">
                  {formatDate(f.issued_at)}
                </p>
              </div>
              <div className="ml-3 flex flex-col items-end gap-0.5">
                <p className="font-semibold">{formatCents(f.amount_cents)}</p>
                <Badge tone={TONE[f.status]}>{f.status}</Badge>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Widget>
  );
}
