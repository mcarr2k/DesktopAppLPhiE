import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { BudgetItem } from "@/types/db";

export function useBudget(semester: string) {
  const [items, setItems] = useState<BudgetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function refetch() {
    setLoading(true);
    const { data, error } = await supabase
      .from("budget_items")
      .select("*")
      .eq("semester", semester)
      .order("kind", { ascending: true })
      .order("category", { ascending: true });
    if (error) setError(error.message);
    else {
      setItems((data ?? []) as BudgetItem[]);
      setError(null);
    }
    setLoading(false);
  }

  useEffect(() => {
    refetch();
    const channel = supabase
      .channel(`budget-feed-${Math.random().toString(36).slice(2, 10)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "budget_items" },
        () => refetch()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [semester]);

  return { items, loading, error, refetch };
}
