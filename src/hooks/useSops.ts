import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Sop } from "@/types/db";

export function useSops() {
  const [sops, setSops] = useState<Sop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function refetch() {
    setLoading(true);
    const { data, error } = await supabase
      .from("sops")
      .select("*")
      .order("category", { ascending: true })
      .order("title", { ascending: true });
    if (error) setError(error.message);
    else {
      setSops((data ?? []) as Sop[]);
      setError(null);
    }
    setLoading(false);
  }

  useEffect(() => {
    refetch();
  }, []);

  return { sops, loading, error, refetch };
}
