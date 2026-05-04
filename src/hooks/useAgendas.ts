import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Agenda } from "@/types/db";

export function useAgendas() {
  const [agendas, setAgendas] = useState<Agenda[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function refetch() {
    setLoading(true);
    const { data, error } = await supabase
      .from("agendas")
      .select("*")
      .order("meeting_date", { ascending: false });
    if (error) setError(error.message);
    else {
      setAgendas((data ?? []) as Agenda[]);
      setError(null);
    }
    setLoading(false);
  }

  useEffect(() => {
    refetch();
  }, []);

  return { agendas, loading, error, refetch };
}
