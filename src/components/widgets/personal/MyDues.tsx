import { useMemo, useState } from "react";
import {
  CreditCard,
  Calendar as CalIcon,
  Clock,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { Widget } from "@/components/shell/Widget";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { useDues } from "@/hooks/useDues";
import { useAuth } from "@/hooks/useAuth";
import { usePaymentClaims } from "@/hooks/usePaymentClaims";
import { formatCents } from "@/lib/format";
import { formatDate } from "@/lib/dates";
import { PaymentClaimModal } from "@/components/widgets/personal/PaymentClaimModal";
import type { Dues, DuesStatus } from "@/types/db";

const TONE: Record<DuesStatus, "neutral" | "gold" | "success" | "danger"> = {
  paid: "success",
  partial: "gold",
  unpaid: "danger",
  waived: "neutral",
};

export function MyDuesWidget({ colSpan = 6 }: { colSpan?: 4 | 6 | 8 | 12 }) {
  const { user } = useAuth();
  const { dues, installmentsFor, loading } = useDues(user?.id);
  const { claims } = usePaymentClaims({ brotherId: user?.id });

  const [activeDues, setActiveDues] = useState<Dues | null>(null);

  const upcoming = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const all: { duesId: string; semester: string; due_date: string; amount_cents: number; paid: boolean }[] =
      [];
    dues.forEach((d) => {
      installmentsFor(d.id).forEach((i) => {
        all.push({
          duesId: d.id,
          semester: d.semester,
          due_date: i.due_date,
          amount_cents: i.amount_cents,
          paid: !!i.paid_on,
        });
      });
    });
    return all
      .filter((p) => !p.paid && p.due_date >= today)
      .sort((a, b) => a.due_date.localeCompare(b.due_date))
      .slice(0, 3);
  }, [dues, installmentsFor]);

  return (
    <Widget
      title="My dues"
      subtitle="What you owe and your payment plan"
      colSpan={colSpan}
    >
      {loading ? (
        <div className="flex items-center justify-center py-6">
          <Spinner />
        </div>
      ) : dues.length === 0 ? (
        <p className="text-sm text-lphie-ink/50">
          No dues records on file. The Treasurer will create one when the
          semester begins.
        </p>
      ) : (
        <div className="space-y-4">
          {dues.map((d) => {
            const remaining = d.amount_owed_cents - d.amount_paid_cents;
            const pct =
              d.amount_owed_cents > 0
                ? Math.min(100, (d.amount_paid_cents / d.amount_owed_cents) * 100)
                : 0;
            const myClaims = claims.filter((c) => c.dues_id === d.id);
            const pendingClaims = myClaims.filter(
              (c) => !c.confirmed_at && !c.rejected_reason
            );
            const rejectedClaims = myClaims.filter((c) => c.rejected_reason);
            const isOpen = remaining > 0 && d.status !== "waived";

            return (
              <div key={d.id} className="rounded-xl border border-lphie-ink/5 bg-white p-4">
                <div className="mb-2 flex items-center justify-between">
                  <div>
                    <p className="font-display text-base font-semibold">
                      {d.semester}
                    </p>
                    <p className="text-xs text-lphie-ink/60">
                      {formatCents(d.amount_paid_cents)} of{" "}
                      {formatCents(d.amount_owed_cents)} paid
                    </p>
                  </div>
                  <Badge tone={TONE[d.status]}>{d.status}</Badge>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-lphie-ink/5">
                  <div
                    className="h-full bg-emerald-500 transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                {remaining > 0 && (
                  <p className="mt-2 text-xs text-lphie-ink/70">
                    <strong>{formatCents(remaining)}</strong> remaining
                  </p>
                )}

                {/* Pending claims for this dues row */}
                {pendingClaims.length > 0 && (
                  <ul className="mt-3 space-y-1">
                    {pendingClaims.map((c) => (
                      <li
                        key={c.id}
                        className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs text-amber-900"
                      >
                        <span className="flex items-center gap-1.5">
                          <Clock size={11} />
                          {formatCents(c.amount_cents)} via {c.method}
                          <span className="text-amber-700/70">
                            · awaiting Treasurer
                          </span>
                        </span>
                        <span className="text-amber-700/70">
                          {formatDate(c.claimed_at)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}

                {rejectedClaims.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {rejectedClaims.slice(0, 1).map((c) => (
                      <li
                        key={c.id}
                        className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs text-rose-900"
                      >
                        <p className="flex items-center gap-1.5 font-semibold">
                          <XCircle size={11} />
                          {formatCents(c.amount_cents)} via {c.method} —
                          rejected
                        </p>
                        <p className="text-rose-700/80">
                          {c.rejected_reason}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}

                {isOpen && (
                  <div className="mt-3 flex justify-end">
                    <Button
                      size="sm"
                      onClick={() => setActiveDues(d)}
                    >
                      <CreditCard size={12} /> Pay dues
                    </Button>
                  </div>
                )}

                {!isOpen && d.status === "paid" && (
                  <p className="mt-2 flex items-center gap-1 text-xs text-emerald-700">
                    <CheckCircle2 size={11} /> All paid for {d.semester}.
                  </p>
                )}
              </div>
            );
          })}

          {upcoming.length > 0 && (
            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-lphie-ink/60">
                Next payments
              </h4>
              <ul className="overflow-hidden rounded-xl border border-lphie-ink/5">
                {upcoming.map((u, i) => (
                  <li
                    key={i}
                    className="flex items-center justify-between border-b border-lphie-ink/5 bg-white px-3 py-2 text-sm last:border-b-0"
                  >
                    <div className="flex items-center gap-2 text-xs">
                      <CalIcon size={12} className="text-lphie-ink/40" />
                      <span>{formatDate(u.due_date)}</span>
                      <span className="text-lphie-ink/40">·</span>
                      <span className="text-lphie-ink/60">{u.semester}</span>
                    </div>
                    <p className="flex items-center gap-2 font-semibold">
                      <CreditCard size={12} className="text-lphie-ink/40" />
                      {formatCents(u.amount_cents)}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {activeDues && (
        <PaymentClaimModal
          open={!!activeDues}
          onClose={() => setActiveDues(null)}
          dues={activeDues}
        />
      )}
    </Widget>
  );
}
