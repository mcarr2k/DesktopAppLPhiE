import { DashboardShell } from "@/components/shell/DashboardShell";
import { UpcomingEventsWidget } from "@/components/widgets/UpcomingEventsWidget";
import { TasksWidget } from "@/components/widgets/TasksWidget";
import { AlumniEmailComposer } from "@/components/widgets/secretary/AlumniEmailComposer";
import { ConstitutionViewer } from "@/components/widgets/secretary/ConstitutionViewer";
import { RecordsCustodian } from "@/components/widgets/secretary/RecordsCustodian";
import { Widget } from "@/components/shell/Widget";
import { useMinutes } from "@/hooks/useMinutes";
import { Badge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/dates";
import { Link } from "react-router-dom";

export default function SecretaryDashboard() {
  const { minutes } = useMinutes();
  const recent = minutes.slice(0, 5);

  return (
    <DashboardShell
      position="secretary"
      title="Secretary"
      subtitle="Chief recording officer — minutes, records, and chapter communications"
    >
      <Widget
        title="Recent minutes"
        subtitle="Last 5 meetings"
        colSpan={6}
        actions={
          <Link
            to="/minutes"
            className="text-xs font-semibold text-lphie-accent hover:underline"
          >
            Full archive →
          </Link>
        }
      >
        {recent.length === 0 ? (
          <p className="text-sm text-lphie-ink/50">No minutes archived yet.</p>
        ) : (
          <ul className="divide-y divide-lphie-ink/5">
            {recent.map((m) => (
              <li
                key={m.id}
                className="flex items-center justify-between py-2 text-sm"
              >
                <div>
                  <p className="font-semibold">{m.title}</p>
                  <p className="text-xs text-lphie-ink/60">
                    {formatDate(m.meeting_date)}
                  </p>
                </div>
                <Badge tone={m.kind === "special" ? "gold" : "neutral"}>
                  {m.kind}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </Widget>
      <UpcomingEventsWidget colSpan={6} />
      <AlumniEmailComposer colSpan={8} />
      <TasksWidget
        mode="assigned-by-me"
        defaultRelatedRole="secretary"
        title="Records tasks"
        subtitle="Delegate Historian / archive work"
        colSpan={4}
      />
      <ConstitutionViewer colSpan={6} />
      <RecordsCustodian colSpan={6} />
    </DashboardShell>
  );
}
