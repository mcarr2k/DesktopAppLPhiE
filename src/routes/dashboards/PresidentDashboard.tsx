import { DashboardShell } from "@/components/shell/DashboardShell";
import { UpcomingEventsWidget } from "@/components/widgets/UpcomingEventsWidget";
import { TasksWidget } from "@/components/widgets/TasksWidget";
import { AgendaBuilder } from "@/components/widgets/president/AgendaBuilder";
import { SemesterSetupWizard } from "@/components/widgets/president/SemesterSetupWizard";
import { StateOfFraternityReport } from "@/components/widgets/president/StateOfFraternityReport";
import { Widget } from "@/components/shell/Widget";
import { useDirectory } from "@/hooks/useDirectory";
import { RoleBadge } from "@/components/ui/Badge";
import { EBOARD_ROLES } from "@/types/role";

export default function PresidentDashboard() {
  const { members } = useDirectory();
  const cabinet = members.filter((m) => EBOARD_ROLES.includes(m.role));

  return (
    <DashboardShell
      position="president"
      title="President's Desk"
      subtitle="Lambda Phi Epsilon — Beta Zeta Chapter"
    >
      <Widget title="Executive board" colSpan={6}>
        <ul className="divide-y divide-lphie-ink/5">
          {cabinet.length === 0 && (
            <li className="py-2 text-sm text-lphie-ink/50">
              No officers assigned yet. Use the directory to assign roles.
            </li>
          )}
          {cabinet.map((m) => (
            <li
              key={m.id}
              className="flex items-center justify-between py-2 text-sm"
            >
              <span className="font-semibold">{m.full_name}</span>
              <RoleBadge role={m.role} />
            </li>
          ))}
        </ul>
      </Widget>
      <UpcomingEventsWidget colSpan={6} />
      <AgendaBuilder colSpan={8} />
      <TasksWidget
        mode="assigned-by-me"
        defaultRelatedRole="president"
        title="Delegated tasks"
        subtitle="Work you've handed to other officers and brothers"
        colSpan={4}
      />
      <SemesterSetupWizard colSpan={6} />
      <StateOfFraternityReport colSpan={6} />
    </DashboardShell>
  );
}
