import { useAuthStore } from "@/stores/authStore";
import { isEboard } from "@/lib/permissions";

export function useAuth() {
  const { user, profile, loading, signIn, signUp, signOut } = useAuthStore();
  return {
    user,
    profile,
    role: profile?.role ?? null,
    isEboard: isEboard(profile?.role),
    loading,
    signIn,
    signUp,
    signOut,
  };
}
