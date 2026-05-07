import { LogOut, Menu } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { RoleBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { effectiveTitles } from "@/lib/titles";

interface TopBarProps {
  onMenuClick?: () => void;
}

export function TopBar({ onMenuClick }: TopBarProps) {
  const { profile, signOut } = useAuth();
  if (!profile) return null;

  const initials = profile.full_name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b border-lphie-ink/10 bg-white/80 px-3 backdrop-blur sm:px-6">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <button
          onClick={onMenuClick}
          aria-label="Open menu"
          className="-ml-1 rounded-lg p-2 text-lphie-ink/70 hover:bg-lphie-ink/5 md:hidden"
        >
          <Menu size={20} />
        </button>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-lphie-ink/5 text-sm font-semibold text-lphie-ink">
          {initials}
        </div>
        <div className="hidden min-w-0 leading-tight sm:block">
          <p className="truncate font-semibold">{profile.full_name}</p>
          <p className="truncate text-xs text-lphie-ink/60">{profile.email}</p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <RoleBadge role={profile.role} />
        {(() => {
          const titles = effectiveTitles(profile);
          if (titles.length === 0) return null;
          const primary = titles[0];
          const extra = titles.length - 1;
          return (
            <span
              className="hidden rounded-full bg-lphie-gold/20 px-2.5 py-0.5 text-xs font-semibold text-lphie-ink ring-1 ring-inset ring-lphie-gold/40 lg:inline"
              title={titles.join(" · ")}
            >
              {primary}
              {extra > 0 ? ` +${extra}` : ""}
            </span>
          );
        })()}
        <Button variant="ghost" size="sm" onClick={signOut} className="hidden sm:inline-flex">
          <LogOut size={14} /> Sign out
        </Button>
        <button
          onClick={signOut}
          aria-label="Sign out"
          className="rounded-lg p-2 text-lphie-ink/70 hover:bg-lphie-ink/5 sm:hidden"
        >
          <LogOut size={16} />
        </button>
      </div>
    </header>
  );
}
