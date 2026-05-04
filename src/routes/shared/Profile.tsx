import { useState, type FormEvent } from "react";
import { Wallet } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useAuthStore } from "@/stores/authStore";
import { supabase } from "@/lib/supabase";
import { Widget } from "@/components/shell/Widget";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { toast } from "@/components/ui/Toast";

export default function Profile() {
  const { profile } = useAuth();
  const refreshProfile = useAuthStore((s) => s.refreshProfile);
  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [pledgeClass, setPledgeClass] = useState(profile?.pledge_class ?? "");
  const [graduationYear, setGraduationYear] = useState(
    profile?.graduation_year?.toString() ?? ""
  );
  const [venmoHandle, setVenmoHandle] = useState(profile?.venmo_handle ?? "");
  const [zelleHandle, setZelleHandle] = useState(profile?.zelle_handle ?? "");
  const [saving, setSaving] = useState(false);

  if (!profile) return null;

  const isTreasurer = profile.role === "treasurer";

  async function onSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName,
        phone: phone || null,
        pledge_class: pledgeClass || null,
        graduation_year: graduationYear ? Number(graduationYear) : null,
        venmo_handle: normalizeVenmo(venmoHandle) || null,
        zelle_handle: zelleHandle.trim() || null,
      })
      .eq("id", profile!.id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Profile updated.");
    await refreshProfile();
  }

  return (
    <div className="p-8">
      <h1 className="mb-6 font-display text-3xl font-bold">My Profile</h1>
      <div className="grid grid-cols-12 gap-6">
        <Widget title="Personal information" colSpan={6}>
          <form onSubmit={onSave} className="space-y-4">
            <Input
              label="Full name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
            <Input
              label="Email"
              value={profile.email}
              disabled
              className="opacity-60"
            />
            <Input
              label="Phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <Input
              label="Pledge class"
              value={pledgeClass}
              onChange={(e) => setPledgeClass(e.target.value)}
              placeholder="e.g. FA23"
            />
            <Input
              label="Graduation year"
              type="number"
              value={graduationYear}
              onChange={(e) => setGraduationYear(e.target.value)}
            />
            <Button type="submit" isLoading={saving}>
              Save changes
            </Button>
          </form>
        </Widget>

        <Widget
          title="Payment handles"
          subtitle={
            isTreasurer
              ? "Brothers will see these on their dues card and pay you here."
              : "Optional — useful for reimbursements between brothers."
          }
          colSpan={6}
        >
          <form onSubmit={onSave} className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-lphie-ink/70">
                Venmo handle
              </label>
              <div className="flex">
                <span className="inline-flex h-10 items-center rounded-l-lg border border-r-0 border-lphie-ink/15 bg-lphie-cream px-3 text-sm text-lphie-ink/60">
                  @
                </span>
                <input
                  className="h-10 w-full rounded-r-lg border border-lphie-ink/15 bg-white px-3 text-sm focus:border-lphie-gold focus:outline-none focus:ring-2 focus:ring-lphie-gold/30"
                  value={venmoHandle.replace(/^@/, "")}
                  onChange={(e) => setVenmoHandle(e.target.value)}
                  placeholder="your-username"
                />
              </div>
              <p className="mt-1 text-[11px] text-lphie-ink/50">
                Just your username — without the @ — exactly as it appears in
                Venmo.
              </p>
            </div>
            <Input
              label="Zelle (phone or email)"
              value={zelleHandle}
              onChange={(e) => setZelleHandle(e.target.value)}
              placeholder="treasurer@vt.edu or 555-555-5555"
            />
            {isTreasurer && (
              <div className="rounded-lg border border-lphie-gold/30 bg-lphie-gold/10 px-3 py-2 text-xs text-lphie-ink/80">
                <p className="flex items-center gap-1 font-semibold">
                  <Wallet size={12} /> You're the chapter Treasurer
                </p>
                <p className="mt-0.5">
                  These handles auto-populate the "Pay dues" buttons every
                  brother sees on their Home page.
                </p>
              </div>
            )}
            <Button type="submit" isLoading={saving}>
              Save payment info
            </Button>
          </form>
        </Widget>
      </div>
    </div>
  );
}

/** Strip a leading @ if the user typed one. Venmo handles don't include it. */
function normalizeVenmo(input: string): string {
  return input.trim().replace(/^@/, "");
}
