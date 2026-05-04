import { NavLink } from "react-router-dom";
import {
  Calendar as CalendarIcon,
  Users,
  FileText,
  LayoutDashboard,
  UserCircle2,
  Home as HomeIcon,
  LogOut,
  Crown,
  Shield,
  Megaphone,
  DollarSign,
  ScrollText,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import {
  POSITION_SLUG,
  POSITION_LABELS,
  type Position,
} from "@/types/role";

const POSITION_ICONS: Record<Position, LucideIcon> = {
  president: Crown,
  vp_internal: Shield,
  vp_external: Megaphone,
  treasurer: DollarSign,
  secretary: ScrollText,
};

interface SidebarProps {
  drawerOpen?: boolean;
  onCloseDrawer?: () => void;
}

export function Sidebar({ drawerOpen = false, onCloseDrawer }: SidebarProps) {
  const { profile, isEboard, signOut } = useAuth();
  const role = profile?.role;
  const isPresident = role === "president";

  const dashboardSlug =
    role && role !== "member" ? POSITION_SLUG[role as Position] : null;

  const links = [
    { to: "/", label: "Home", icon: HomeIcon, show: true, end: true },
    { to: "/calendar", label: "Calendar", icon: CalendarIcon, show: true },
    { to: "/directory", label: "Directory", icon: Users, show: true },
    { to: "/minutes", label: "Minutes", icon: FileText, show: true },
    {
      to: dashboardSlug ? `/dashboard/${dashboardSlug}` : "/",
      label: "My Dashboard",
      icon: LayoutDashboard,
      show: isEboard && !!dashboardSlug && !isPresident,
    },
    { to: "/profile", label: "My Profile", icon: UserCircle2, show: true },
  ].filter((l) => l.show);

  const officerDashboards: { slug: Position; label: string }[] = isPresident
    ? [
        { slug: "president", label: POSITION_LABELS.president },
        { slug: "vp_internal", label: POSITION_LABELS.vp_internal },
        { slug: "vp_external", label: POSITION_LABELS.vp_external },
        { slug: "treasurer", label: POSITION_LABELS.treasurer },
        { slug: "secretary", label: POSITION_LABELS.secretary },
      ]
    : [];

  const initials = profile?.full_name
    ? profile.full_name
        .split(" ")
        .map((p) => p[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "??";

  return (
    <aside
      className={[
        // Desktop: classic sticky sidebar in the document flow.
        // Mobile: fixed drawer that slides in from the left.
        "flex w-64 shrink-0 flex-col border-r border-lphie-ink/10 bg-white",
        "fixed inset-y-0 left-0 z-40 h-screen transform transition-transform duration-200 ease-out md:sticky md:top-0 md:translate-x-0",
        drawerOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full md:shadow-none",
      ].join(" ")}
    >
      <div className="flex h-16 items-center justify-end border-b border-lphie-ink/10 px-3 md:hidden">
        <button
          onClick={onCloseDrawer}
          aria-label="Close menu"
          className="rounded-lg p-2 text-lphie-ink/60 hover:bg-lphie-ink/5"
        >
          <X size={18} />
        </button>
      </div>
      <div className="hidden h-16 border-b border-lphie-ink/10 md:block" />
      <nav className="flex-1 overflow-y-auto p-3">
        <ul className="space-y-1">
          {links.map((l) => {
            const Icon = l.icon;
            return (
              <li key={l.to}>
                <NavLink
                  to={l.to}
                  end={l.end}
                  className={({ isActive }) =>
                    [
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-lphie-gold/20 text-lphie-ink"
                        : "text-lphie-ink/70 hover:bg-lphie-ink/5",
                    ].join(" ")
                  }
                >
                  <Icon size={18} />
                  {l.label}
                </NavLink>
              </li>
            );
          })}
        </ul>

        {officerDashboards.length > 0 && (
          <div className="mt-5">
            <p className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-widest text-lphie-ink/50">
              Officer Dashboards
            </p>
            <ul className="space-y-1">
              {officerDashboards.map((d) => {
                const Icon = POSITION_ICONS[d.slug];
                return (
                  <li key={d.slug}>
                    <NavLink
                      to={`/dashboard/${POSITION_SLUG[d.slug]}`}
                      className={({ isActive }) =>
                        [
                          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                          isActive
                            ? "bg-lphie-gold/20 text-lphie-ink"
                            : "text-lphie-ink/70 hover:bg-lphie-ink/5",
                        ].join(" ")
                      }
                    >
                      <Icon size={16} />
                      {d.label}
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </nav>

      {profile && (
        <div className="border-t border-lphie-ink/10 p-3">
          <div className="mb-2 flex items-center gap-2 rounded-lg bg-lphie-cream/60 px-2 py-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-lphie-ink/5 text-xs font-semibold text-lphie-ink">
              {initials}
            </div>
            <div className="min-w-0 flex-1 leading-tight">
              <p className="truncate text-xs font-semibold text-lphie-ink">
                {profile.full_name}
              </p>
              <p className="truncate text-[10px] uppercase tracking-wider text-lphie-ink/60">
                {POSITION_LABELS[profile.role]}
                {profile.title ? ` · ${profile.title}` : ""}
              </p>
            </div>
          </div>
          <button
            onClick={signOut}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-lphie-ink/10 bg-white px-3 py-2 text-sm font-semibold text-lphie-ink hover:bg-lphie-cream"
          >
            <LogOut size={14} />
            Sign out
          </button>
          <p className="mt-2 text-center text-[10px] text-lphie-ink/40">
            v0.1.0 · Phase 2
          </p>
        </div>
      )}
    </aside>
  );
}
