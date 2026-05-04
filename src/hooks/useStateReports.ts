import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { StateReport } from "@/types/db";

export function useStateReports() {
  const [reports, setReports] = useState<StateReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function refetch() {
    setLoading(true);
    const { data, error } = await supabase
      .from("state_reports")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) setError(error.message);
    else {
      setReports((data ?? []) as StateReport[]);
      setError(null);
    }
    setLoading(false);
  }

  useEffect(() => {
    refetch();
    const channel = supabase
      .channel(`state_reports-feed-${Math.random().toString(36).slice(2, 10)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "state_reports" },
        () => refetch()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { reports, loading, error, refetch };
}
