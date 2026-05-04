import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { CheckIn } from "@/types/db";

export function useCheckIns(semester?: string) {
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function refetch() {
    setLoading(true);
    let q = supabase
      .from("check_ins")
      .select("*")
      .order("conducted_at", { ascending: false });
    if (semester) q = q.eq("semester", semester);
    const { data, error } = await q;
    if (error) setError(error.message);
    else {
      setCheckIns((data ?? []) as CheckIn[]);
      setError(null);
    }
    setLoading(false);
  }

  useEffect(() => {
    refetch();
    const channel = supabase
      .channel(`check_ins-feed-${Math.random().toString(36).slice(2, 10)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "check_ins" },
        () => refetch()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [semester]);

  return { checkIns, loading, error, refetch };
}
