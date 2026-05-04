import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { FormalPlan, FormalRsvp } from "@/types/db";

/** Picks the academic year string for a given date — Aug→Jul cycle. */
export function currentAcademicYear(now = new Date()): string {
  const m = now.getMonth() + 1;
  const y = now.getFullYear();
  return m >= 7 ? `${y}-${y + 1}` : `${y - 1}-${y}`;
}

export function useFormalPlan(academicYear: string = currentAcademicYear()) {
  const [plan, setPlan] = useState<FormalPlan | null>(null);
  const [rsvps, setRsvps] = useState<FormalRsvp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function refetch() {
    setLoading(true);
    const { data: planRow, error: planErr } = await supabase
      .from("formal_plans")
      .select("*")
      .eq("academic_year", academicYear)
      .maybeSingle();
    if (planErr) {
      setError(planErr.message);
      setLoading(false);
      return;
    }
    setPlan((planRow as FormalPlan | null) ?? null);

    if (planRow) {
      const { data: rsvpRows, error: rsvpErr } = await supabase
        .from("formal_rsvps")
        .select("*")
        .eq("formal_id", planRow.id);
      if (rsvpErr) setError(rsvpErr.message);
      else setRsvps((rsvpRows ?? []) as FormalRsvp[]);
    } else {
      setRsvps([]);
    }
    setError(null);
    setLoading(false);
  }

  useEffect(() => {
    refetch();
    const channel = supabase
      .channel(`formal-feed-${Math.random().toString(36).slice(2, 10)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "formal_plans" },
        () => refetch()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "formal_rsvps" },
        () => refetch()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [academicYear]);

  return { plan, rsvps, loading, error, refetch };
}
