import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Dues, DuesInstallment } from "@/types/db";

export function useDues(brotherId?: string) {
  const [dues, setDues] = useState<Dues[]>([]);
  const [installments, setInstallments] = useState<DuesInstallment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function refetch() {
    setLoading(true);
    let q = supabase.from("dues").select("*").order("semester", { ascending: false });
    if (brotherId) q = q.eq("brother_id", brotherId);
    const { data: duesRows, error: duesErr } = await q;
    if (duesErr) {
      setError(duesErr.message);
      setLoading(false);
      return;
    }

    const ids = (duesRows ?? []).map((d) => d.id);
    let installs: DuesInstallment[] = [];
    if (ids.length > 0) {
      const { data: instRows, error: instErr } = await supabase
        .from("dues_installments")
        .select("*")
        .in("dues_id", ids)
        .order("due_date", { ascending: true });
      if (instErr) {
        // dues_installments table may not exist yet if the user
        // hasn't re-run the latest schema migration. Don't block —
        // just render dues without payment-plan info.
        console.warn("dues_installments query failed:", instErr.message);
      } else {
        installs = (instRows ?? []) as DuesInstallment[];
      }
    }

    setDues((duesRows ?? []) as Dues[]);
    setInstallments(installs);
    setError(null);
    setLoading(false);
  }

  useEffect(() => {
    refetch();
    const channel = supabase
      .channel(`dues-feed-${Math.random().toString(36).slice(2, 10)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "dues" },
        () => refetch()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "dues_installments" },
        () => refetch()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brotherId]);

  function installmentsFor(duesId: string) {
    return installments.filter((i) => i.dues_id === duesId);
  }

  return { dues, installments, installmentsFor, loading, error, refetch };
}
