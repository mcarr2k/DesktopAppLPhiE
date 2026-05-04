import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { DuesPaymentClaim } from "@/types/db";

interface Options {
  brotherId?: string;
  onlyPending?: boolean;
}

export function usePaymentClaims(opts: Options = {}) {
  const [claims, setClaims] = useState<DuesPaymentClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function refetch() {
    setLoading(true);
    let q = supabase
      .from("dues_payment_claims")
      .select("*")
      .order("claimed_at", { ascending: false });
    if (opts.brotherId) q = q.eq("brother_id", opts.brotherId);
    if (opts.onlyPending) {
      q = q.is("confirmed_at", null).is("rejected_reason", null);
    }
    const { data, error } = await q;
    if (error) setError(error.message);
    else {
      setClaims((data ?? []) as DuesPaymentClaim[]);
      setError(null);
    }
    setLoading(false);
  }

  useEffect(() => {
    refetch();
    const channel = supabase
      .channel(`claims-feed-${Math.random().toString(36).slice(2, 10)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "dues_payment_claims" },
        () => refetch()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opts.brotherId, opts.onlyPending]);

  return { claims, loading, error, refetch };
}
