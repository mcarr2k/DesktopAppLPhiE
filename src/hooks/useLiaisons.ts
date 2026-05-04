import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { LiaisonContact } from "@/types/db";

export function useLiaisons() {
  const [contacts, setContacts] = useState<LiaisonContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function refetch() {
    setLoading(true);
    const { data, error } = await supabase
      .from("liaison_contacts")
      .select("*")
      .order("organization", { ascending: true });
    if (error) setError(error.message);
    else {
      setContacts((data ?? []) as LiaisonContact[]);
      setError(null);
    }
    setLoading(false);
  }

  useEffect(() => {
    refetch();
  }, []);

  return { contacts, loading, error, refetch };
}
