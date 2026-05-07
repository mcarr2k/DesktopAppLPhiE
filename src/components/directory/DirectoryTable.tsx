import { useState } from "react";
import { Pencil } from "lucide-react";
import { useDirectory } from "@/hooks/useDirectory";
import { useAuth } from "@/hooks/useAuth";
import { canEditDirectory } from "@/lib/permissions";
import { ROLES, POSITION_LABELS, type Role } from "@/types/role";
import { RoleBadge, Badge } from "@/components/ui/Badge";
import { supabase } from "@/lib/supabase";
import { toast } from "@/components/ui/Toast";
import { Spinner } from "@/components/ui/Spinner";
import { TitlesEditorModal } from "./TitlesEditorModal";
import { effectiveTitles } from "@/lib/titles";
import type { MemberStatus, Profile } from "@/types/db";

const STATUSES: MemberStatus[] = ["active", "alumni", "pledge", "inactive"];

export function DirectoryTable() {
  const { members, loading, refetch } = useDirectory();
  const { role: myRole } = useAuth();
  const canEdit = canEditDirectory(myRole);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [editingTitlesFor, setEditingTitlesFor] = useState<Profile | null>(null);

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

  async function saveTitles(member: Profile, newTitles: string[]) {
    // Clear the deprecated single column at the same time so the two
    // never disagree. (`title` is harmless if left set, but the UX is
    // simpler if it's gone.)
    const ok = await updateField(member, {
      titles: newTitles,
      title: null,
    });
    if (ok) {
      toast.success(
        newTitles.length === 0
          ? "All titles cleared."
          : `${newTitles.length} title${newTitles.length === 1 ? "" : "s"} saved.`
      );
      setEditingTitlesFor(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner />
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto rounded-2xl border border-lphie-ink/5 bg-white shadow-widget">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="bg-lphie-cream text-left text-xs uppercase tracking-wider text-lphie-ink/60">
            <tr>
              <th className="px-4 py-3">Brother</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Pledge class</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Cabinet titles</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => {
              const titles = effectiveTitles(m);
              return (
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
                  <td className="px-4 py-3 text-lphie-ink/80">
                    {m.phone ?? "—"}
                  </td>
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
                        onChange={(e) =>
                          updateRole(m, e.target.value as Role)
                        }
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
                    <div className="flex flex-wrap items-center gap-1.5">
                      {titles.length === 0 ? (
                        <span className="text-lphie-ink/40">—</span>
                      ) : (
                        titles.map((t) => (
                          <Badge key={t} tone="gold">
                            {t}
                          </Badge>
                        ))
                      )}
                      {canEdit && (
                        <button
                          onClick={() => setEditingTitlesFor(m)}
                          disabled={savingId === m.id}
                          className="ml-1 inline-flex items-center gap-1 rounded-md border border-lphie-ink/10 bg-white px-2 py-0.5 text-[11px] font-semibold text-lphie-ink/70 hover:bg-lphie-cream"
                        >
                          <Pencil size={11} />
                          {titles.length === 0 ? "Add" : "Edit"}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
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

      <TitlesEditorModal
        open={!!editingTitlesFor}
        brother={editingTitlesFor}
        saving={savingId === editingTitlesFor?.id}
        onSave={async (newTitles) => {
          if (editingTitlesFor) {
            await saveTitles(editingTitlesFor, newTitles);
          }
        }}
        onClose={() => setEditingTitlesFor(null)}
      />
    </>
  );
}
