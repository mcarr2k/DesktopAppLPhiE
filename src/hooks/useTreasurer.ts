import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Profile } from "@/types/db";

/**
 * Resolves the current Treasurer profile (so we can read their Venmo /
 * Zelle handles for pay-dues buttons). Falls back to President if no
 * Treasurer is currently assigned.
 */
export function useTreasurer() {
  const [treasurer, setTreasurer] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  async function refetch() {
    setLoading(true);

    // Try Treasurer first.
    const { data: t } = await supabase
      .from("profiles")
      .select("*")
      .eq("role", "treasurer")
      .maybeSingle();

    if (t) {
      setTreasurer(t as Profile);
      setLoading(false);
      return;
    }

    // Fall back to President.
    const { data: p } = await supabase
      .from("profiles")
      .select("*")
      .eq("role", "president")
      .maybeSingle();

    setTreasurer((p as Profile | null) ?? null);
    setLoading(false);
  }

  useEffect(() => {
    refetch();

    // The role changes infrequently, but we still listen so the dues
    // card auto-updates when the chapter rotates officers.
    const channel = supabase
      .channel(`treasurer-feed-${Math.random().toString(36).slice(2, 10)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles" },
        () => refetch()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { treasurer, loading, refetch };
}
