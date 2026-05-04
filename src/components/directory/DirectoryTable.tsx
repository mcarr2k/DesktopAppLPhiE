import { useState } from "react";
import { useDirectory } from "@/hooks/useDirectory";
import { useAuth } from "@/hooks/useAuth";
import { canEditDirectory } from "@/lib/permissions";
import { ROLES, POSITION_LABELS, type Role } from "@/types/role";
import { CABINET_GROUPS } from "@/types/cabinet";
import { RoleBadge, Badge } from "@/components/ui/Badge";
import { supabase } from "@/lib/supabase";
import { toast } from "@/components/ui/Toast";
import { Spinner } from "@/components/ui/Spinner";
import type { MemberStatus, Profile } from "@/types/db";

const STATUSES: MemberStatus[] = ["active", "alumni", "pledge", "inactive"];

export function DirectoryTable() {
  const { members, loading, refetch } = useDirectory();
  const { role: myRole } = useAuth();
  const canEdit = canEditDirectory(myRole);
  const [savingId, setSavingId] = useState<string | null>(null);

  async function updateField(member: Profile, patch: Partial<Profile>) {
    setSavingId(member.id);
    const { error } = await supabase
      .from("profiles")
      .update(patch)
      .eq("id", member.id);
    setSavingId(null);
    if (error) {
      toast.error(error.message);
      return false;
    }
    // Defensive: realtime sync sometimes lags or stalls.
    // Force a fresh fetch so the row reflects the change immediately.
    refetch();
    return true;
  }

  async function updateRole(member: Profile, newRole: Role) {
    const ok = await updateField(member, { role: newRole });
    if (ok)
      toast.success(`${member.full_name} → ${POSITION_LABELS[newRole]}`);
  }

  async function updateStatus(member: Profile, newStatus: MemberStatus) {
    const ok = await updateField(member, { status: newStatus });
    if (ok) toast.success("Status updated.");
  }

  async function updateTitle(member: Profile, newTitle: string) {
    const value = newTitle.trim() === "" ? null : newTitle;
    const ok = await updateField(member, { title: value });
    if (ok) toast.success(value ? `Title: ${value}` : "Title cleared.");
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-lphie-ink/5 bg-white shadow-widget">
      <table className="w-full text-sm">
        <thead className="bg-lphie-cream text-left text-xs uppercase tracking-wider text-lphie-ink/60">
          <tr>
            <th className="px-4 py-3">Brother</th>
            <th className="px-4 py-3">Email</th>
            <th className="px-4 py-3">Phone</th>
            <th className="px-4 py-3">Pledge class</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Role</th>
            <th className="px-4 py-3">Cabinet title</th>
          </tr>
        </thead>
        <tbody>
          {members.map((m) => (
            <tr
              key={m.id}
              className="border-t border-lphie-ink/5 hover:bg-lphie-cream/50"
            >
              <td className="px-4 py-3 font-semibold">
                {m.full_name}
                {m.graduation_year && (
                  <span className="ml-2 text-xs text-lphie-ink/50">
                    '{String(m.graduation_year).slice(2)}
                  </span>
                )}
              </td>
              <td className="px-4 py-3 text-lphie-ink/80">{m.email}</td>
              <td className="px-4 py-3 text-lphie-ink/80">{m.phone ?? "—"}</td>
              <td className="px-4 py-3 text-lphie-ink/80">
                {m.pledge_class ?? "—"}
              </td>
              <td className="px-4 py-3">
                {canEdit ? (
                  <select
                    className="rounded-md border border-lphie-ink/15 bg-white px-2 py-1 text-xs"
                    value={m.status}
                    disabled={savingId === m.id}
                    onChange={(e) =>
                      updateStatus(m, e.target.value as MemberStatus)
                    }
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                ) : (
                  <Badge>{m.status}</Badge>
                )}
              </td>
              <td className="px-4 py-3">
                {canEdit ? (
                  <select
                    className="rounded-md border border-lphie-ink/15 bg-white px-2 py-1 text-xs"
                    value={m.role}
                    disabled={savingId === m.id}
                    onChange={(e) => updateRole(m, e.target.value as Role)}
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {POSITION_LABELS[r]}
                      </option>
                    ))}
                  </select>
                ) : (
                  <RoleBadge role={m.role} />
                )}
              </td>
              <td className="px-4 py-3">
                {canEdit ? (
                  <select
                    className="rounded-md border border-lphie-ink/15 bg-white px-2 py-1 text-xs"
                    value={m.title ?? ""}
                    disabled={savingId === m.id}
                    onChange={(e) => updateTitle(m, e.target.value)}
                  >
                    <option value="">— none —</option>
                    {Object.values(CABINET_GROUPS).map((group) => (
                      <optgroup key={group.label} label={group.label}>
                        {group.titles.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                    {/* Preserve a custom title that's not in the predefined list */}
                    {m.title &&
                      !Object.values(CABINET_GROUPS)
                        .flatMap((g) => g.titles as readonly string[])
                        .includes(m.title) && (
                        <optgroup label="Custom">
                          <option value={m.title}>{m.title}</option>
                        </optgroup>
                      )}
                  </select>
                ) : m.title ? (
                  <Badge tone="gold">{m.title}</Badge>
                ) : (
                  <span className="text-lphie-ink/40">—</span>
                )}
              </td>
            </tr>
          ))}
          {members.length === 0 && (
            <tr>
              <td
                colSpan={7}
                className="px-4 py-8 text-center text-lphie-ink/50"
              >
                No brothers yet. They'll appear here when they sign up.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
