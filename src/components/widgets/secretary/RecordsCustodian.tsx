import { useMemo, useState } from "react";
import { ExternalLink, FileUp, Search, Trash2, Folder } from "lucide-react";
import { Widget } from "@/components/shell/Widget";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Spinner } from "@/components/ui/Spinner";
import { Badge } from "@/components/ui/Badge";
import { toast } from "@/components/ui/Toast";
import { useDocuments, getSignedUrl, STORAGE_BUCKET } from "@/hooks/useDocuments";
import { useAuth } from "@/hooks/useAuth";
import { isEboard } from "@/lib/permissions";
import { formatDate } from "@/lib/dates";
import { supabase } from "@/lib/supabase";
import { UploadDocumentModal } from "@/components/widgets/shared/UploadDocumentModal";
import type { DocumentKind } from "@/types/db";

interface Props {
  colSpan?: 4 | 6 | 8 | 12;
}

const KIND_LABELS: Record<DocumentKind, string> = {
  constitution: "Constitution",
  sop: "SOP",
  record: "Record",
  publicity: "Publicity",
  other: "Other",
};

export function RecordsCustodian({ colSpan = 12 }: Props) {
  const { documents, loading, refetch } = useDocuments();
  const { role } = useAuth();
  const canManage = isEboard(role);

  const [search, setSearch] = useState("");
  const [kindFilter, setKindFilter] = useState<DocumentKind | "all">("all");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [opening, setOpening] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return documents.filter((d) => {
      if (kindFilter !== "all" && d.kind !== kindFilter) return false;
      if (!term) return true;
      return (
        d.title.toLowerCase().includes(term) ||
        (d.description ?? "").toLowerCase().includes(term)
      );
    });
  }, [documents, search, kindFilter]);

  async function open(storagePath: string) {
    setOpening(storagePath);
    const url = await getSignedUrl(storagePath);
    setOpening(null);
    if (!url) {
      toast.error("Couldn't generate a signed URL.");
      return;
    }
    window.open(url, "_blank");
  }

  async function remove(id: string, storagePath: string) {
    if (!confirm("Delete this document? This cannot be undone.")) return;
    const { error } = await supabase.from("documents").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    await supabase.storage.from(STORAGE_BUCKET).remove([storagePath]);
    refetch();
  }

  return (
    <Widget
      title="Records archive"
      subtitle="All chapter documents · stored privately in Supabase Storage"
      colSpan={colSpan}
      actions={
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-lphie-ink/40"
            />
            <Input
              className="h-8 pl-9 text-xs"
              placeholder="Search…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="h-8 rounded-lg border border-lphie-ink/15 bg-white px-2 text-xs"
            value={kindFilter}
            onChange={(e) =>
              setKindFilter(e.target.value as DocumentKind | "all")
            }
          >
            <option value="all">All kinds</option>
            {(Object.keys(KIND_LABELS) as DocumentKind[]).map((k) => (
              <option key={k} value={k}>
                {KIND_LABELS[k]}
              </option>
            ))}
          </select>
          {canManage && (
            <Button size="sm" onClick={() => setUploadOpen(true)}>
              <FileUp size={12} /> Upload
            </Button>
          )}
        </div>
      }
    >
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Spinner />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-lphie-ink/15 bg-white/50 px-4 py-12 text-center">
          <Folder size={28} className="mx-auto mb-2 text-lphie-ink/30" />
          <p className="text-sm text-lphie-ink/60">
            {documents.length === 0
              ? "No documents archived yet."
              : "No documents match your filters."}
          </p>
        </div>
      ) : (
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wider text-lphie-ink/50">
            <tr>
              <th className="px-2 py-1">Title</th>
              <th className="px-2 py-1">Kind</th>
              <th className="px-2 py-1">Size</th>
              <th className="px-2 py-1">Uploaded</th>
              <th className="px-2 py-1"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((d) => (
              <tr
                key={d.id}
                className="border-t border-lphie-ink/5 hover:bg-lphie-cream/40"
              >
                <td className="px-2 py-2">
                  <p className="font-semibold">{d.title}</p>
                  {d.description && (
                    <p className="text-xs text-lphie-ink/50">{d.description}</p>
                  )}
                </td>
                <td className="px-2 py-2">
                  <Badge tone={d.kind === "constitution" ? "gold" : "neutral"}>
                    {KIND_LABELS[d.kind]}
                  </Badge>
                </td>
                <td className="px-2 py-2 text-xs text-lphie-ink/60">
                  {d.size_bytes
                    ? `${(d.size_bytes / 1024).toFixed(1)} KB`
                    : "—"}
                </td>
                <td className="px-2 py-2 text-xs text-lphie-ink/60">
                  {formatDate(d.uploaded_at)}
                </td>
                <td className="px-2 py-2 text-right">
                  <div className="flex justify-end gap-1">
                    <button
                      onClick={() => open(d.storage_path)}
                      disabled={opening === d.storage_path}
                      className="rounded px-2 py-1 text-xs font-semibold text-lphie-accent hover:bg-lphie-cream disabled:opacity-50"
                    >
                      <ExternalLink size={12} className="inline" /> Open
                    </button>
                    {canManage && (
                      <button
                        onClick={() => remove(d.id, d.storage_path)}
                        className="rounded p-1 text-lphie-ink/40 hover:bg-rose-50 hover:text-rose-700"
                        aria-label="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <UploadDocumentModal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onUploaded={refetch}
        defaultKind="record"
        title="Upload to records archive"
      />
    </Widget>
  );
}
