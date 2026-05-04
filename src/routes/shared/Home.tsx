import { useAuth } from "@/hooks/useAuth";
import { TasksWidget } from "@/components/widgets/TasksWidget";
import { UpcomingEventsWidget } from "@/components/widgets/UpcomingEventsWidget";
import { MyDuesWidget } from "@/components/widgets/personal/MyDues";
import { MyFinesWidget } from "@/components/widgets/personal/MyFines";
import { Link } from "react-router-dom";
import { POSITION_SLUG, type Position } from "@/types/role";
import { LayoutDashboard } from "lucide-react";

export default function Home() {
  const { profile, isEboard } = useAuth();
  if (!profile) return null;

  const dashboardSlug =
    isEboard && profile.role !== "member"
      ? POSITION_SLUG[profile.role as Position]
      : null;

  return (
    <div className="p-8">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-lphie-ink/60">
            Today
          </p>
          <h1 className="font-display text-3xl font-bold text-lphie-ink">
            Welcome back, {profile.full_name.split(" ")[0]}.
          </h1>
        </div>
        {dashboardSlug && (
          <Link
            to={`/dashboard/${dashboardSlug}`}
            className="inline-flex items-center gap-2 rounded-lg border border-lphie-ink/10 bg-white px-3 py-2 text-sm font-semibold hover:bg-lphie-cream"
          >
            <LayoutDashboard size={16} />
            My officer dashboard →
          </Link>
        )}
      </header>

      <div className="grid grid-cols-12 gap-6">
        <TasksWidget mode="assigned-to-me" colSpan={6} />
        <UpcomingEventsWidget colSpan={6} />
        <MyDuesWidget colSpan={6} />
        <MyFinesWidget colSpan={6} />
      </div>
    </div>
  );
}
