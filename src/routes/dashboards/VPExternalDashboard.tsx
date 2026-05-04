import { DashboardShell } from "@/components/shell/DashboardShell";
import { UpcomingEventsWidget } from "@/components/widgets/UpcomingEventsWidget";
import { TasksWidget } from "@/components/widgets/TasksWidget";
import { LiaisonContacts } from "@/components/widgets/vpExternal/LiaisonContacts";
import { PublicityUploader } from "@/components/widgets/vpExternal/PublicityUploader";
import { AnnualFormalPlanner } from "@/components/widgets/vpExternal/AnnualFormalPlanner";

export default function VPExternalDashboard() {
  return (
    <DashboardShell
      position="vp_external"
      title="VP External"
      subtitle="Mixers, parties, social functions, and inter-organization liaison"
    >
      <UpcomingEventsWidget colSpan={6} />
      <TasksWidget
        mode="assigned-by-me"
        defaultRelatedRole="vp_external"
        title="External cabinet tasks"
        subtitle="Delegate to Rush, PR, Social, AASU rep, etc."
        colSpan={6}
      />
      <AnnualFormalPlanner colSpan={12} />
      <LiaisonContacts colSpan={6} />
      <PublicityUploader colSpan={6} />
    </DashboardShell>
  );
}
