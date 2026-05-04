import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { ChapterDocument, DocumentKind } from "@/types/db";

export function useDocuments(kind?: DocumentKind | DocumentKind[]) {
  const [documents, setDocuments] = useState<ChapterDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function refetch() {
    setLoading(true);
    let q = supabase
      .from("documents")
      .select("*")
      .order("uploaded_at", { ascending: false });
    if (kind) {
      const kinds = Array.isArray(kind) ? kind : [kind];
      q = q.in("kind", kinds);
    }
    const { data, error } = await q;
    if (error) setError(error.message);
    else {
      setDocuments((data ?? []) as ChapterDocument[]);
      setError(null);
    }
    setLoading(false);
  }

  useEffect(() => {
    refetch();
    const channel = supabase
      .channel(`documents-feed-${Math.random().toString(36).slice(2, 10)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "documents" },
        () => refetch()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Array.isArray(kind) ? kind.join(",") : kind]);

  return { documents, loading, error, refetch };
}

export const STORAGE_BUCKET = "chapter-records";

/** Get a signed download URL valid for 5 minutes. */
export async function getSignedUrl(
  storagePath: string,
  expiresIn = 60 * 5
): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(storagePath, expiresIn);
  if (error || !data) {
    console.error("[storage] signed URL failed:", error);
    return null;
  }
  return data.signedUrl;
}
