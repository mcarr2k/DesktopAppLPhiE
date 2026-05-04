import { DashboardShell } from "@/components/shell/DashboardShell";
import { UpcomingEventsWidget } from "@/components/widgets/UpcomingEventsWidget";
import { TasksWidget } from "@/components/widgets/TasksWidget";
import { FinesLog } from "@/components/widgets/vpInternal/FinesLog";
import { SOPLibrary } from "@/components/widgets/vpInternal/SOPLibrary";
import { CheckInTracker } from "@/components/widgets/vpInternal/CheckInTracker";

export default function VPInternalDashboard() {
  return (
    <DashboardShell
      position="vp_internal"
      title="VP Internal"
      subtitle="Discipline, brotherhood check-ins, and internal cabinet oversight"
    >
      <FinesLog colSpan={6} />
      <UpcomingEventsWidget colSpan={6} />
      <TasksWidget
        mode="assigned-by-me"
        defaultRelatedRole="vp_internal"
        title="Internal cabinet tasks"
        subtitle="Delegate to Academic, NME, Brotherhood, Risk Mgmt chairs"
        colSpan={6}
      />
      <CheckInTracker colSpan={6} />
      <SOPLibrary colSpan={12} />
    </DashboardShell>
  );
}
