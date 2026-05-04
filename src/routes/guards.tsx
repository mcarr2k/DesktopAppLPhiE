import { Navigate, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { FullPageSpinner } from "@/components/ui/Spinner";
import { isEboard } from "@/lib/permissions";
import type { Role } from "@/types/role";

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <FullPageSpinner />;
  if (!user) return <Navigate to="/auth/signin" state={{ from: location }} replace />;
  return <>{children}</>;
}

export function RequireEboard({ children }: { children: ReactNode }) {
  const { profile, loading } = useAuth();
  if (loading) return <FullPageSpinner />;
  if (!isEboard(profile?.role)) return <Navigate to="/calendar" replace />;
  return <>{children}</>;
}

export function RequireRole({
  role,
  children,
}: {
  role: Role | Role[];
  children: ReactNode;
}) {
  const { profile, loading } = useAuth();
  if (loading) return <FullPageSpinner />;
  const allowed = Array.isArray(role) ? role : [role];
  if (!profile || !allowed.includes(profile.role))
    return <Navigate to="/calendar" replace />;
  return <>{children}</>;
}
