import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Fine } from "@/types/db";

export function useFines(brotherId?: string) {
  const [fines, setFines] = useState<Fine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function refetch() {
    setLoading(true);
    let query = supabase
      .from("fines")
      .select("*")
      .order("issued_at", { ascending: false });
    if (brotherId) query = query.eq("brother_id", brotherId);
    const { data, error } = await query;
    if (error) setError(error.message);
    else {
      setFines((data ?? []) as Fine[]);
      setError(null);
    }
    setLoading(false);
  }

  useEffect(() => {
    refetch();
    const channel = supabase
      .channel(`fines-feed-${Math.random().toString(36).slice(2, 10)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "fines" },
        () => refetch()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brotherId]);

  return { fines, loading, error, refetch };
}
