import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Task } from "@/types/db";

interface Options {
  assignedTo?: string;
  assignedBy?: string;
  status?: "open" | "all";
}

export function useTasks(opts: Options = {}) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function refetch() {
    setLoading(true);
    let query = supabase
      .from("tasks")
      .select("*")
      .order("due_date", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false });
    if (opts.assignedTo) query = query.eq("assigned_to", opts.assignedTo);
    if (opts.assignedBy) query = query.eq("assigned_by", opts.assignedBy);
    if (opts.status === "open") query = query.in("status", ["open", "in_progress"]);
    const { data, error } = await query;
    if (error) setError(error.message);
    else {
      setTasks((data ?? []) as Task[]);
      setError(null);
    }
    setLoading(false);
  }

  useEffect(() => {
    refetch();
    const channel = supabase
      .channel(`tasks-feed-${Math.random().toString(36).slice(2, 10)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks" },
        () => refetch()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opts.assignedTo, opts.assignedBy, opts.status]);

  return { tasks, loading, error, refetch };
}
