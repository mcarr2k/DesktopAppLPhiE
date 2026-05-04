import { useEffect, useState, type FormEvent } from "react";
import { ExternalLink, Copy, Wallet, Smartphone, AlertTriangle } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Input, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { toast } from "@/components/ui/Toast";
import { useAuth } from "@/hooks/useAuth";
import { useTreasurer } from "@/hooks/useTreasurer";
import { supabase } from "@/lib/supabase";
import { buildVenmoUrl, describeZelleHandle } from "@/lib/payments";
import { formatCents, parseDollarsToCents } from "@/lib/format";
import type { Dues, PaymentMethod } from "@/types/db";

interface Props {
  open: boolean;
  onClose: () => void;
  dues: Dues;
  onSubmitted?: () => void;
}

const METHODS: { value: PaymentMethod; label: string; icon: React.ReactNode }[] = [
  { value: "venmo", label: "Venmo", icon: <Wallet size={14} /> },
  { value: "zelle", label: "Zelle", icon: <Smartphone size={14} /> },
  { value: "cash", label: "Cash", icon: <Wallet size={14} /> },
  { value: "check", label: "Check", icon: <Wallet size={14} /> },
  { value: "other", label: "Other", icon: <Wallet size={14} /> },
];

export function PaymentClaimModal({ open, onClose, dues, onSubmitted }: Props) {
  const { user } = useAuth();
  const { treasurer, loading: treasurerLoading } = useTreasurer();

  const remaining = dues.amount_owed_cents - dues.amount_paid_cents;

  const [method, setMethod] = useState<PaymentMethod>("venmo");
  const [amount, setAmount] = useState((remaining / 100).toFixed(2));
  const [memo, setMemo] = useState(`${dues.semester} dues`);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Re-sync defaults whenever a fresh modal opens.
  useEffect(() => {
    if (!open) return;
    setMethod("venmo");
    setAmount((remaining / 100).toFixed(2));
    setMemo(`${dues.semester} dues`);
    setNotes("");
  }, [open, dues.id, remaining, dues.semester]);

  const venmoUrl =
    treasurer?.venmo_handle
      ? buildVenmoUrl({
          handle: treasurer.venmo_handle,
          amountCents: parseDollarsToCents(amount) ?? 0,
          note: memo,
        })
      : null;

  const zelleType = describeZelleHandle(treasurer?.zelle_handle);

  function openVenmo() {
    if (!venmoUrl) return;
    // Electron's setWindowOpenHandler routes window.open() through
    // shell.openExternal, so this opens the system browser → Venmo web.
    // On a phone with the Venmo app installed, the same URL deep-links.
    window.open(venmoUrl, "_blank");
  }

  async function copyZelle() {
    if (!treasurer?.zelle_handle) return;
    try {
      await navigator.clipboard.writeText(treasurer.zelle_handle);
      toast.success("Zelle handle copied.");
    } catch {
      toast.error("Couldn't copy.");
    }
  }

  async function copyMemo() {
    try {
      await navigator.clipboard.writeText(memo);
      toast.success("Memo copied.");
    } catch {
      toast.error("Couldn't copy.");
    }
  }

  async function submitClaim(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    const cents = parseDollarsToCents(amount);
    if (!cents || cents <= 0) {
      toast.error("Enter a valid amount.");
      return;
    }
    if (cents > remaining + 100) {
      // Allow $1 of slop for rounding, otherwise prevent over-payment claims.
      toast.error(
        `Amount can't exceed remaining balance (${formatCents(remaining)}).`
      );
      return;
    }

    setSubmitting(true);

    const externalHandle =
      method === "venmo"
        ? treasurer?.venmo_handle
        : method === "zelle"
          ? treasurer?.zelle_handle
          : null;

    const { error } = await supabase.from("dues_payment_claims").insert({
      dues_id: dues.id,
      brother_id: user.id,
      method,
      amount_cents: cents,
      external_handle: externalHandle ?? null,
      memo: notes.trim() || memo,
    });

    setSubmitting(false);

    if (error) {
      if (error.code === "42P01") {
        toast.error(
          "dues_payment_claims table missing — re-run supabase/schema.sql."
        );
      } else if (
        error.code === "42501" ||
        /row-level security/i.test(error.message)
      ) {
        toast.error(
          "RLS denied. Re-run supabase/policies.sql, then sign out and back in."
        );
      } else {
        toast.error(error.message);
      }
      return;
    }

    toast.success(
      "Payment reported. Treasurer will confirm once the funds land."
    );
    onSubmitted?.();
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Pay ${dues.semester} dues`}
      width="md"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="payment-claim-form"
            isLoading={submitting}
          >
            I paid — submit for confirmation
          </Button>
        </div>
      }
    >
      <form id="payment-claim-form" onSubmit={submitClaim} className="space-y-5">
        {/* Treasurer info banner */}
        {treasurerLoading ? null : !treasurer ? (
          <div className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            <p className="flex items-center gap-1 font-semibold">
              <AlertTriangle size={12} /> No Treasurer assigned
            </p>
            <p>
              Ask the President to assign a Treasurer in the directory, or
              record an offline payment below.
            </p>
          </div>
        ) : !treasurer.venmo_handle && !treasurer.zelle_handle ? (
          <div className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            <p className="flex items-center gap-1 font-semibold">
              <AlertTriangle size={12} /> Treasurer hasn't published handles
            </p>
            <p>
              Ask <strong>{treasurer.full_name}</strong> to add a Venmo or
              Zelle handle on their Profile page.
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-lphie-gold/30 bg-lphie-gold/10 p-3 text-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-lphie-ink/60">
              Send payment to
            </p>
            <p className="font-semibold">{treasurer.full_name}</p>
            <p className="text-xs text-lphie-ink/70">
              Treasurer · Beta Zeta
            </p>
          </div>
        )}

        {/* Method picker */}
        <fieldset>
          <legend className="mb-1 block text-xs font-semibold uppercase tracking-wider text-lphie-ink/70">
            Method
          </legend>
          <div className="flex flex-wrap gap-2">
            {METHODS.map((m) => (
              <button
                key={m.value}
                type="button"
                onClick={() => setMethod(m.value)}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                  method === m.value
                    ? "border-lphie-gold bg-lphie-gold text-lphie-ink"
                    : "border-lphie-ink/15 bg-white text-lphie-ink/60 hover:bg-lphie-cream"
                }`}
              >
                {m.icon}
                {m.label}
              </button>
            ))}
          </div>
        </fieldset>

        {/* Method-specific call to action */}
        {method === "venmo" && treasurer?.venmo_handle && (
          <div className="space-y-2 rounded-xl border border-lphie-ink/10 bg-lphie-cream/40 p-3">
            <p className="text-xs font-semibold text-lphie-ink/70">
              Step 1 · Open Venmo with the amount prefilled
            </p>
            <p className="text-xs text-lphie-ink/60">
              Sending to{" "}
              <span className="font-mono font-semibold">
                @{treasurer.venmo_handle}
              </span>{" "}
              · {formatCents(parseDollarsToCents(amount) ?? 0)} · "{memo}"
            </p>
            <Button type="button" onClick={openVenmo} variant="secondary">
              <ExternalLink size={12} /> Open Venmo
            </Button>
            <p className="pt-1 text-[11px] text-lphie-ink/50">
              On desktop this opens venmo.com in your browser. On a phone the
              Venmo app will open with the fields prefilled. After you pay,
              come back here and submit.
            </p>
          </div>
        )}

        {method === "zelle" && treasurer?.zelle_handle && (
          <div className="space-y-2 rounded-xl border border-lphie-ink/10 bg-lphie-cream/40 p-3">
            <p className="text-xs font-semibold text-lphie-ink/70">
              Step 1 · Open your bank's Zelle, then send to:
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded-lg bg-white px-3 py-2 font-mono text-sm">
                {treasurer.zelle_handle}
              </code>
              <Button type="button" variant="secondary" onClick={copyZelle}>
                <Copy size={12} /> Copy
              </Button>
            </div>
            <p className="text-[11px] text-lphie-ink/50">
              {zelleType === "phone"
                ? "Phone number · use the Zelle option in your bank's app."
                : zelleType === "email"
                  ? "Email · use the Zelle option in your bank's app."
                  : "Use the Zelle option in your bank's app."}
              {" "}
              Memo: <code>{memo}</code>{" "}
              <button
                type="button"
                onClick={copyMemo}
                className="text-lphie-accent hover:underline"
              >
                copy
              </button>
            </p>
            <p className="text-[11px] text-amber-700">
              Note: Zelle has no third-party API, so we can't open Zelle for
              you the way Venmo allows.
            </p>
          </div>
        )}

        {/* Amount + memo */}
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Amount paid ($)"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
          <Input
            label="Memo (in your payment app)"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
          />
        </div>

        <Textarea
          label="Notes (optional)"
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Anything the Treasurer should know — e.g. 'Sent at 3pm, partial payment'"
        />

        <p className="rounded-lg bg-lphie-ink/5 px-3 py-2 text-[11px] text-lphie-ink/70">
          The Treasurer will confirm receipt before this counts against your
          balance. You'll see status updates in real time.
        </p>
      </form>
    </Modal>
  );
}
