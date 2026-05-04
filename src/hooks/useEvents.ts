import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { ChapterEvent } from "@/types/db";

export function useEvents() {
  const [events, setEvents] = useState<ChapterEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function refetch() {
    setLoading(true);
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .order("starts_at", { ascending: true });
    if (error) setError(error.message);
    else {
      setEvents((data ?? []) as ChapterEvent[]);
      setError(null);
    }
    setLoading(false);
  }

  useEffect(() => {
    refetch();

    const channel = supabase
      .channel(`events-feed-${Math.random().toString(36).slice(2, 10)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "events" },
        (payload) => {
          setEvents((prev) => {
            if (payload.eventType === "INSERT") {
              return [...prev, payload.new as ChapterEvent].sort((a, b) =>
                a.starts_at.localeCompare(b.starts_at)
              );
            }
            if (payload.eventType === "UPDATE") {
              return prev.map((e) =>
                e.id === (payload.new as ChapterEvent).id
                  ? (payload.new as ChapterEvent)
                  : e
              );
            }
            if (payload.eventType === "DELETE") {
              return prev.filter(
                (e) => e.id !== (payload.old as ChapterEvent).id
              );
            }
            return prev;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { events, loading, error, refetch };
}
