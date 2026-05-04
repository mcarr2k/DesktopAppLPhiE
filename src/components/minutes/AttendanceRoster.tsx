import { useDirectory } from "@/hooks/useDirectory";
import type { Attendance } from "@/types/db";

interface Props {
  attendance: Map<string, Attendance>;
  onToggle: (brotherId: string, present: boolean, excused: boolean) => void;
  readOnly?: boolean;
}

export function AttendanceRoster({ attendance, onToggle, readOnly }: Props) {
  const { members } = useDirectory();
  const active = members.filter(
    (m) => m.status === "active" || m.status === "pledge"
  );

  return (
    <div className="max-h-96 overflow-auto rounded-xl border border-lphie-ink/10 bg-white">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-lphie-cream text-left text-xs uppercase tracking-wider text-lphie-ink/60">
          <tr>
            <th className="px-3 py-2">Brother</th>
            <th className="px-3 py-2 text-center">Present</th>
            <th className="px-3 py-2 text-center">Excused</th>
          </tr>
        </thead>
        <tbody>
          {active.map((m) => {
            const a = attendance.get(m.id);
            return (
              <tr key={m.id} className="border-t border-lphie-ink/5">
                <td className="px-3 py-2 font-medium">{m.full_name}</td>
                <td className="px-3 py-2 text-center">
                  <input
                    type="checkbox"
                    disabled={readOnly}
                    checked={a?.present ?? false}
                    onChange={(e) =>
                      onToggle(m.id, e.target.checked, a?.excused ?? false)
                    }
                  />
                </td>
                <td className="px-3 py-2 text-center">
                  <input
                    type="checkbox"
                    disabled={readOnly}
                    checked={a?.excused ?? false}
                    onChange={(e) =>
                      onToggle(m.id, a?.present ?? false, e.target.checked)
                    }
                  />
                </td>
              </tr>
            );
          })}
          {active.length === 0 && (
            <tr>
              <td
                colSpan={3}
                className="px-3 py-6 text-center text-lphie-ink/50"
              >
                No active brothers in the directory yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
