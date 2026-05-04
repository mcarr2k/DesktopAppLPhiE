import { LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { RoleBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

export function TopBar() {
  const { profile, signOut } = useAuth();
  if (!profile) return null;

  const initials = profile.full_name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-lphie-ink/10 bg-white/80 px-6 backdrop-blur">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-lphie-ink/5 text-sm font-semibold text-lphie-ink">
          {initials}
        </div>
        <div className="leading-tight">
          <p className="font-semibold">{profile.full_name}</p>
          <p className="text-xs text-lphie-ink/60">{profile.email}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <RoleBadge role={profile.role} />
        {profile.title && (
          <span className="hidden rounded-full bg-lphie-gold/20 px-2.5 py-0.5 text-xs font-semibold text-lphie-ink ring-1 ring-inset ring-lphie-gold/40 lg:inline">
            {profile.title}
          </span>
        )}
        <Button variant="ghost" size="sm" onClick={signOut}>
          <LogOut size={14} /> Sign out
        </Button>
      </div>
    </header>
  );
}
