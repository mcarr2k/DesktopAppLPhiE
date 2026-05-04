import { useState } from "react";
import { ExternalLink, FileUp, ScrollText, Download } from "lucide-react";
import { Widget } from "@/components/shell/Widget";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { toast } from "@/components/ui/Toast";
import { useDocuments, getSignedUrl, STORAGE_BUCKET } from "@/hooks/useDocuments";
import { useAuth } from "@/hooks/useAuth";
import { canWriteMinutes } from "@/lib/permissions";
import { formatDate } from "@/lib/dates";
import { supabase } from "@/lib/supabase";
import { UploadDocumentModal } from "@/components/widgets/shared/UploadDocumentModal";

interface Props {
  colSpan?: 4 | 6 | 8 | 12;
}

export function ConstitutionViewer({ colSpan = 6 }: Props) {
  const { documents, loading, refetch } = useDocuments("constitution");
  const { role } = useAuth();
  const canManage = canWriteMinutes(role); // secretary or president

  const [uploadOpen, setUploadOpen] = useState(false);
  const [opening, setOpening] = useState<string | null>(null);

  // The "current" constitution is just the most recently uploaded one.
  const current = documents[0];
  const archive = documents.slice(1);

  async function open(storagePath: string) {
    setOpening(storagePath);
    const url = await getSignedUrl(storagePath);
    setOpening(null);
    if (!url) {
      toast.error("Couldn't generate a signed URL.");
      return;
    }
    // Open in default browser via Electron's shell handler
    window.open(url, "_blank");
  }

  async function remove(id: string, storagePath: string) {
    if (!confirm("Delete this constitution version? This cannot be undone."))
      return;
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
      title="Constitution"
      subtitle="Custodian of all records · Article 4 §10"
      colSpan={colSpan}
      actions={
        canManage && (
          <Button size="sm" variant="secondary" onClick={() => setUploadOpen(true)}>
            <FileUp size={12} /> Upload version
          </Button>
        )
      }
    >
      {loading ? (
        <div className="flex items-center justify-center py-6">
          <Spinner />
        </div>
      ) : !current ? (
        <div className="rounded-xl border border-dashed border-lphie-ink/15 bg-white/50 px-4 py-8 text-center">
          <ScrollText size={28} className="mx-auto mb-2 text-lphie-ink/30" />
          <p className="text-sm text-lphie-ink/60">
            No constitution uploaded yet.
          </p>
          {canManage && (
            <Button
              size="sm"
              variant="secondary"
              className="mt-3"
              onClick={() => setUploadOpen(true)}
            >
              <FileUp size={12} /> Upload constitution
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Current */}
          <div className="rounded-xl border border-lphie-gold/30 bg-lphie-gold/10 p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-lphie-ink/60">
              Current
            </p>
            <h4 className="font-display text-lg font-bold">{current.title}</h4>
            {current.description && (
              <p className="text-sm text-lphie-ink/70">{current.description}</p>
            )}
            <p className="mt-1 text-xs text-lphie-ink/50">
              Uploaded {formatDate(current.uploaded_at)}
            </p>
            <div className="mt-3 flex gap-2">
              <Button
                size="sm"
                onClick={() => open(current.storage_path)}
                isLoading={opening === current.storage_path}
              >
                <ExternalLink size={12} /> Open
              </Button>
              {canManage && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => remove(current.id, current.storage_path)}
                >
                  Delete
                </Button>
              )}
            </div>
          </div>

          {/* Archive */}
          {archive.length > 0 && (
            <details className="text-sm">
              <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wider text-lphie-ink/60">
                Older versions ({archive.length})
              </summary>
              <ul className="mt-2 divide-y divide-lphie-ink/5">
                {archive.map((d) => (
                  <li
                    key={d.id}
                    className="flex items-center justify-between py-2"
                  >
                    <div>
                      <p className="font-semibold">{d.title}</p>
                      <p className="text-xs text-lphie-ink/50">
                        {formatDate(d.uploaded_at)}
                      </p>
                    </div>
                    <button
                      onClick={() => open(d.storage_path)}
                      className="text-xs font-semibold text-lphie-accent hover:underline"
                    >
                      <Download size={12} className="inline" /> Open
                    </button>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}

      <UploadDocumentModal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onUploaded={refetch}
        defaultKind="constitution"
        folder="constitution"
        title="Upload constitution"
        allowedKinds={["constitution"]}
      />
    </Widget>
  );
}
