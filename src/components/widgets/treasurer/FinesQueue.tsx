import { useMemo, useState } from "react";
import { Check, X, Trash2 } from "lucide-react";
import { Widget } from "@/components/shell/Widget";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { toast } from "@/components/ui/Toast";
import { useFines } from "@/hooks/useFines";
import { useDirectory } from "@/hooks/useDirectory";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { formatCents } from "@/lib/format";
import { formatDate } from "@/lib/dates";
import type { Fine, FineStatus } from "@/types/db";

const TONE: Record<FineStatus, "neutral" | "gold" | "success" | "danger"> = {
  pending: "gold",
  approved: "neutral",
  paid: "success",
  waived: "neutral",
};

export function FinesQueue({ colSpan = 6 }: { colSpan?: 4 | 6 | 8 | 12 }) {
  const { fines, loading } = useFines();
  const { members } = useDirectory();
  const { user } = useAuth();
  const [filter, setFilter] = useState<"open" | "all">("open");

  const display = useMemo(() => {
    if (filter === "open")
      return fines.filter(
        (f) => f.status === "pending" || f.status === "approved"
      );
    return fines;
  }, [fines, filter]);

  async function setStatus(fine: Fine, next: FineStatus) {
    if (!user) return;
    const patch: Record<string, unknown> = { status: next };
    if (next === "paid" || next === "waived") {
      patch.resolved_by = user.id;
      patch.resolved_at = new Date().toISOString();
    }
    if (next === "pending") {
      patch.resolved_by = null;
      patch.resolved_at = null;
    }
    const { error } = await supabase
      .from("fines")
      .update(patch)
      .eq("id", fine.id);
    if (error) toast.error(error.message);
    else if (next === "paid") {
      // Auto-log a transaction so the ledger reflects the cash.
      await supabase.from("transactions").insert({
        kind: "income",
        amount_cents: fine.amount_cents,
        category: "Fines",
        memo: `Fine paid: ${fine.reason}`,
        occurred_on: new Date().toISOString().slice(0, 10),
        recorded_by: user.id,
        linked_fine_id: fine.id,
      });
      toast.success("Marked paid and logged to ledger.");
    } else {
      toast.success(`Fine ${next}.`);
    }
  }

  async function remove(fine: Fine) {
    if (!confirm(`Delete fine: "${fine.reason}"?`)) return;
    const { error } = await supabase.from("fines").delete().eq("id", fine.id);
    if (error) toast.error(error.message);
  }

  return (
    <Widget
      title="Fines queue"
      subtitle="Approve, mark paid, or waive"
      colSpan={colSpan}
      actions={
        <div className="inline-flex rounded-lg border border-lphie-ink/10 bg-white p-0.5 text-xs">
          {(["open", "all"] as const).map((opt) => (
            <button
              key={opt}
              onClick={() => setFilter(opt)}
              className={`rounded-md px-2 py-1 font-semibold transition-colors ${
                filter === opt
                  ? "bg-lphie-gold text-lphie-ink"
                  : "text-lphie-ink/60 hover:bg-lphie-ink/5"
              }`}
            >
              {opt === "open" ? "Open" : "All"}
            </button>
          ))}
        </div>
      }
    >
      {loading ? (
        <div className="flex items-center justify-center py-6">
          <Spinner />
        </div>
      ) : display.length === 0 ? (
        <p className="text-sm text-lphie-ink/50">
          {filter === "open"
            ? "No open fines. Brothers are behaving."
            : "No fines on record."}
        </p>
      ) : (
        <ul className="divide-y divide-lphie-ink/5">
          {display.map((f) => {
            const brother = members.find((m) => m.id === f.brother_id);
            return (
              <li key={f.id} className="py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">
                        {brother?.full_name ?? "—"}
                      </p>
                      <Badge tone={TONE[f.status]}>{f.status}</Badge>
                    </div>
                    <p className="text-sm text-lphie-ink/70">{f.reason}</p>
                    <p className="mt-0.5 text-xs text-lphie-ink/50">
                      {formatCents(f.amount_cents)} · issued{" "}
                      {formatDate(f.issued_at)}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {f.status === "pending" && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setStatus(f, "approved")}
                      >
                        <Check size={14} /> Approve
                      </Button>
                    )}
                    {(f.status === "pending" || f.status === "approved") && (
                      <Button size="sm" onClick={() => setStatus(f, "paid")}>
                        Mark paid
                      </Button>
                    )}
                    {f.status !== "waived" && f.status !== "paid" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setStatus(f, "waived")}
                      >
                        <X size={14} /> Waive
                      </Button>
                    )}
                    <button
                      onClick={() => remove(f)}
                      className="rounded p-1 text-lphie-ink/40 hover:bg-rose-50 hover:text-rose-700"
                      aria-label="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Widget>
  );
}
