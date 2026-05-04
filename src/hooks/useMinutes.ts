import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Minutes } from "@/types/db";

export function useMinutes(searchTerm = "") {
  const [minutes, setMinutes] = useState<Minutes[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function refetch() {
    setLoading(true);
    let query = supabase
      .from("minutes")
      .select("*")
      .order("meeting_date", { ascending: false });
    if (searchTerm.trim()) {
      query = query.or(
        `title.ilike.%${searchTerm}%,body_text.ilike.%${searchTerm}%`
      );
    }
    const { data, error } = await query;
    if (error) setError(error.message);
    else {
      setMinutes((data ?? []) as Minutes[]);
      setError(null);
    }
    setLoading(false);
  }

  useEffect(() => {
    refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  return { minutes, loading, error, refetch };
}
