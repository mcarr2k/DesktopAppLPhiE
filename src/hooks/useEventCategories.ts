import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { EventCategory } from "@/types/db";

export function useEventCategories() {
  const [categories, setCategories] = useState<EventCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function refetch() {
    setLoading(true);
    const { data, error } = await supabase
      .from("event_categories")
      .select("*")
      .order("name", { ascending: true });
    if (error) setError(error.message);
    else {
      setCategories((data ?? []) as EventCategory[]);
      setError(null);
    }
    setLoading(false);
  }

  useEffect(() => {
    refetch();
    const channel = supabase
      .channel(`event-categories-${Math.random().toString(36).slice(2, 10)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "event_categories" },
        () => refetch()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  function findById(id: string | null | undefined): EventCategory | undefined {
    if (!id) return undefined;
    return categories.find((c) => c.id === id);
  }

  function findByName(name: string): EventCategory | undefined {
    return categories.find(
      (c) => c.name.toLowerCase() === name.toLowerCase()
    );
  }

  return { categories, loading, error, refetch, findById, findByName };
}
