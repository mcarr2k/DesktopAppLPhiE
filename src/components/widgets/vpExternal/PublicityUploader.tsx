import { useEffect, useState } from "react";
import { ImageIcon, FileUp, Trash2, ExternalLink } from "lucide-react";
import { Widget } from "@/components/shell/Widget";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { toast } from "@/components/ui/Toast";
import { useDocuments, getSignedUrl, STORAGE_BUCKET } from "@/hooks/useDocuments";
import { useAuth } from "@/hooks/useAuth";
import { isEboard } from "@/lib/permissions";
import { formatDate } from "@/lib/dates";
import { supabase } from "@/lib/supabase";
import { UploadDocumentModal } from "@/components/widgets/shared/UploadDocumentModal";

interface Props {
  colSpan?: 4 | 6 | 8 | 12;
}

/**
 * Publicity assets are images (and the occasional PDF) attached to
 * upcoming events. The widget renders thumbnails by lazily fetching
 * a signed URL for each asset's storage path.
 */
export function PublicityUploader({ colSpan = 6 }: Props) {
  const { documents, loading, refetch } = useDocuments("publicity");
  const { role } = useAuth();
  const canManage = isEboard(role);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({});

  // Resolve signed URLs for image previews.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const next: Record<string, string> = {};
      for (const d of documents) {
        if (!d.mime_type?.startsWith("image/")) continue;
        const url = await getSignedUrl(d.storage_path, 60 * 30);
        if (cancelled) return;
        if (url) next[d.id] = url;
      }
      if (!cancelled) setThumbnails(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [documents]);

  async function open(storagePath: string) {
    const url = await getSignedUrl(storagePath);
    if (!url) {
      toast.error("Couldn't generate a signed URL.");
      return;
    }
    window.open(url, "_blank");
  }

  async function remove(id: string, storagePath: string) {
    if (!confirm("Delete this asset? This cannot be undone.")) return;
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
      title="Publicity uploader"
      subtitle="Flyers, posters, social posts"
      colSpan={colSpan}
      actions={
        canManage && (
          <Button size="sm" onClick={() => setUploadOpen(true)}>
            <FileUp size={12} /> Upload asset
          </Button>
        )
      }
    >
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Spinner />
        </div>
      ) : documents.length === 0 ? (
        <div className="rounded-xl border border-dashed border-lphie-ink/15 bg-white/50 px-4 py-12 text-center">
          <ImageIcon size={28} className="mx-auto mb-2 text-lphie-ink/30" />
          <p className="text-sm text-lphie-ink/60">
            No publicity assets uploaded yet.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {documents.map((d) => (
            <div
              key={d.id}
              className="group overflow-hidden rounded-xl border border-lphie-ink/10 bg-white"
            >
              <button
                onClick={() => open(d.storage_path)}
                className="block aspect-square w-full overflow-hidden bg-lphie-ink/5"
              >
                {thumbnails[d.id] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={thumbnails[d.id]}
                    alt={d.title}
                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-lphie-ink/30">
                    <ImageIcon size={28} />
                  </div>
                )}
              </button>
              <div className="p-2">
                <p className="truncate text-xs font-semibold">{d.title}</p>
                <p className="text-[10px] text-lphie-ink/50">
                  {formatDate(d.uploaded_at)}
                </p>
                <div className="mt-1 flex items-center justify-between">
                  <button
                    onClick={() => open(d.storage_path)}
                    className="text-[10px] font-semibold text-lphie-accent hover:underline"
                  >
                    <ExternalLink size={10} className="inline" /> Open
                  </button>
                  {canManage && (
                    <button
                      onClick={() => remove(d.id, d.storage_path)}
                      className="rounded p-1 text-lphie-ink/40 hover:bg-rose-50 hover:text-rose-700"
                      aria-label="Delete"
                    >
                      <Trash2 size={11} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <UploadDocumentModal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onUploaded={refetch}
        defaultKind="publicity"
        folder="publicity"
        title="Upload publicity asset"
        allowedKinds={["publicity"]}
      />
    </Widget>
  );
}
