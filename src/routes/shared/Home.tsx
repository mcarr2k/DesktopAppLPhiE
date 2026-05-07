import { useAuth } from "@/hooks/useAuth";
import { TasksWidget } from "@/components/widgets/TasksWidget";
import { UpcomingEventsWidget } from "@/components/widgets/UpcomingEventsWidget";
import { MyDuesWidget } from "@/components/widgets/personal/MyDues";
import { MyFinesWidget } from "@/components/widgets/personal/MyFines";
import { MyCabinetWidget } from "@/components/widgets/personal/MyCabinet";
import { Link } from "react-router-dom";
import { POSITION_SLUG, type Position } from "@/types/role";
import { LayoutDashboard } from "lucide-react";
import { effectiveTitles } from "@/lib/titles";

export default function Home() {
  const { profile, isEboard } = useAuth();
  if (!profile) return null;

  const dashboardSlug =
    isEboard && profile.role !== "member"
      ? POSITION_SLUG[profile.role as Position]
      : null;

  // Brothers with cabinet titles get an extra "My cabinet work" widget
  // up top, plus a "delegated by me" tasks widget alongside it.
  const hasCabinetTitles = effectiveTitles(profile).length > 0;

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <header className="mb-6 flex flex-col gap-3 sm:mb-8 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-lphie-ink/60 sm:text-xs">
            Today
          </p>
          <h1 className="font-display text-2xl font-bold text-lphie-ink sm:text-3xl">
            Welcome back, {profile.full_name.split(" ")[0]}.
          </h1>
        </div>
        {dashboardSlug && (
          <Link
            to={`/dashboard/${dashboardSlug}`}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-lphie-ink/10 bg-white px-3 py-2 text-sm font-semibold hover:bg-lphie-cream sm:w-auto"
          >
            <LayoutDashboard size={16} />
            My officer dashboard →
          </Link>
        )}
      </header>

      <div className="grid grid-cols-12 gap-4 sm:gap-6">
        {hasCabinetTitles && <MyCabinetWidget colSpan={12} />}
        <TasksWidget mode="assigned-to-me" colSpan={6} />
        {hasCabinetTitles ? (
          <TasksWidget
            mode="assigned-by-me"
            title="Tasks I've delegated"
            subtitle="Work you've handed off to brothers in your cabinet"
            colSpan={6}
          />
        ) : (
          <UpcomingEventsWidget colSpan={6} />
        )}
        {hasCabinetTitles && <UpcomingEventsWidget colSpan={6} />}
        <MyDuesWidget colSpan={hasCabinetTitles ? 6 : 6} />
        <MyFinesWidget colSpan={6} />
      </div>
    </div>
  );
}
