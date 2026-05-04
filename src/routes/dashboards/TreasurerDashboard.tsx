import { DashboardShell } from "@/components/shell/DashboardShell";
import { UpcomingEventsWidget } from "@/components/widgets/UpcomingEventsWidget";
import { TasksWidget } from "@/components/widgets/TasksWidget";
import { FinancialCharts } from "@/components/widgets/treasurer/FinancialCharts";
import { Ledger } from "@/components/widgets/treasurer/Ledger";
import { DuesTracker } from "@/components/widgets/treasurer/DuesTracker";
import { FinesQueue } from "@/components/widgets/treasurer/FinesQueue";
import { BudgetBuilder } from "@/components/widgets/treasurer/BudgetBuilder";
import { BiweeklySummary } from "@/components/widgets/treasurer/BiweeklySummary";
import { PaymentClaimsQueue } from "@/components/widgets/treasurer/PaymentClaimsQueue";

export default function TreasurerDashboard() {
  return (
    <DashboardShell
      position="treasurer"
      title="Treasurer"
      subtitle="Chief financial officer — funds, dues, budget, and biweekly updates"
    >
      <FinancialCharts />
      <PaymentClaimsQueue colSpan={6} />
      <FinesQueue colSpan={6} />
      <Ledger colSpan={12} />
      <DuesTracker colSpan={12} />
      <BudgetBuilder colSpan={12} />
      <BiweeklySummary colSpan={6} />
      <TasksWidget
        mode="assigned-by-me"
        defaultRelatedRole="treasurer"
        defaultCategory="Fundraising"
        title="Fundraising tasks"
        subtitle="Delegate to the Fundraising Chair or any brother"
        colSpan={6}
      />
      <UpcomingEventsWidget colSpan={12} />
    </DashboardShell>
  );
}
