import { useMemo, useState } from "react";
import {
  CheckCircle2,
  XCircle,
  Wallet,
  Smartphone,
  AlertTriangle,
  Inbox,
} from "lucide-react";
import { Widget } from "@/components/shell/Widget";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Textarea } from "@/components/ui/Input";
import { Spinner } from "@/components/ui/Spinner";
import { Badge } from "@/components/ui/Badge";
import { toast } from "@/components/ui/Toast";
import { usePaymentClaims } from "@/hooks/usePaymentClaims";
import { useDirectory } from "@/hooks/useDirectory";
import { useAuth } from "@/hooks/useAuth";
import { canManageDues } from "@/lib/permissions";
import { supabase } from "@/lib/supabase";
import { formatCents } from "@/lib/format";
import { formatDate } from "@/lib/dates";
import type { DuesPaymentClaim, PaymentMethod } from "@/types/db";

interface Props {
  colSpan?: 4 | 6 | 8 | 12;
}

const METHOD_ICON: Record<PaymentMethod, React.ReactNode> = {
  venmo: <Wallet size={12} />,
  zelle: <Smartphone size={12} />,
  cash: <Wallet size={12} />,
  check: <Wallet size={12} />,
  other: <Wallet size={12} />,
};

export function PaymentClaimsQueue({ colSpan = 6 }: Props) {
  const { role } = useAuth();
  const canResolve = canManageDues(role);
  const { claims, loading, error, refetch } = usePaymentClaims({
    onlyPending: true,
  });
  const { members } = useDirectory();

  const [rejecting, setRejecting] = useState<DuesPaymentClaim | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const dbMissing =
    !!error && /relation .*dues_payment_claims.* does not exist/i.test(error);

  const lookups = useMemo(
    () => new Map(members.map((m) => [m.id, m])),
    [members]
  );

  async function confirm(claim: DuesPaymentClaim) {
    setBusyId(claim.id);
    const { error } = await supabase
      .from("dues_payment_claims")
      .update({
        confirmed_at: new Date().toISOString(),
        rejected_reason: null,
      })
      .eq("id", claim.id);
    setBusyId(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Payment confirmed. Brother's dues balance updated.");
    refetch();
  }

  async function reject() {
    if (!rejecting) return;
    if (!rejectReason.trim()) {
      toast.error("Add a short reason so the brother knows why.");
      return;
    }
    setBusyId(rejecting.id);
    const { error } = await supabase
      .from("dues_payment_claims")
      .update({ rejected_reason: rejectReason.trim() })
      .eq("id", rejecting.id);
    setBusyId(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Claim rejected — brother will see your reason.");
    setRejecting(null);
    setRejectReason("");
    refetch();
  }

  return (
    <Widget
      title="Pending payment claims"
      subtitle="Brothers who reported a payment — confirm once you see the funds"
      colSpan={colSpan}
      actions={<Badge tone="gold">{claims.length} pending</Badge>}
    >
      {dbMissing ? (
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="mb-1 flex items-center gap-2 font-semibold">
            <AlertTriangle size={14} /> dues_payment_claims table missing
          </p>
          <p className="text-xs">
            Re-run <code>supabase/schema.sql</code> followed by{" "}
            <code>supabase/policies.sql</code>.
          </p>
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center py-6">
          <Spinner />
        </div>
      ) : claims.length === 0 ? (
        <div className="rounded-xl border border-dashed border-lphie-ink/15 bg-white/50 px-4 py-10 text-center">
          <Inbox size={26} className="mx-auto mb-2 text-lphie-ink/30" />
          <p className="text-sm text-lphie-ink/60">No pending claims. 🎉</p>
        </div>
      ) : (
        <ul className="divide-y divide-lphie-ink/5">
          {claims.map((c) => {
            const brother = lookups.get(c.brother_id);
            return (
              <li key={c.id} className="py-3 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">
                      {brother?.full_name ?? "Unknown brother"}
                    </p>
                    <p className="flex items-center gap-1.5 text-xs text-lphie-ink/60">
                      {METHOD_ICON[c.method]}
                      <span className="font-mono">
                        {formatCents(c.amount_cents)} via {c.method}
                      </span>
                      <span>·</span>
                      <span>{formatDate(c.claimed_at)}</span>
                    </p>
                    {c.external_handle && (
                      <p className="text-[11px] text-lphie-ink/50">
                        Sent to {c.external_handle}
                      </p>
                    )}
                    {c.memo && (
                      <p className="mt-0.5 text-xs italic text-lphie-ink/60">
                        "{c.memo}"
                      </p>
                    )}
                  </div>
                  {canResolve && (
                    <div className="flex shrink-0 gap-1.5">
                      <Button
                        size="sm"
                        onClick={() => confirm(c)}
                        isLoading={busyId === c.id}
                      >
                        <CheckCircle2 size={12} /> Confirm
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setRejecting(c);
                          setRejectReason("");
                        }}
                      >
                        <XCircle size={12} /> Reject
                      </Button>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Modal
        open={!!rejecting}
        onClose={() => setRejecting(null)}
        title="Reject payment claim"
        width="sm"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setRejecting(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={reject}
              isLoading={busyId === rejecting?.id}
            >
              Reject claim
            </Button>
          </div>
        }
      >
        {rejecting && (
          <div className="space-y-3">
            <p className="text-sm text-lphie-ink/70">
              Rejecting{" "}
              <strong>{lookups.get(rejecting.brother_id)?.full_name}</strong>'s{" "}
              {formatCents(rejecting.amount_cents)} claim. They'll see the
              reason on their dues card and can resubmit.
            </p>
            <Textarea
              label="Reason"
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. 'Funds didn't arrive in Venmo. Resend with memo.'"
            />
          </div>
        )}
      </Modal>
    </Widget>
  );
}
