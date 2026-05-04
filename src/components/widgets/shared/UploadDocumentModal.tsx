import { useState, useRef, type FormEvent } from "react";
import { UploadCloud } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Input, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { toast } from "@/components/ui/Toast";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { STORAGE_BUCKET } from "@/hooks/useDocuments";
import type { DocumentKind } from "@/types/db";

interface Props {
  open: boolean;
  onClose: () => void;
  onUploaded?: () => void;
  defaultKind?: DocumentKind;
  /** Folder prefix inside the bucket, e.g. "publicity" or "constitution". */
  folder?: string;
  title?: string;
  /** Restrict the visibility of the kind selector. If only one kind is allowed, hide the picker. */
  allowedKinds?: DocumentKind[];
}

const KIND_LABELS: Record<DocumentKind, string> = {
  constitution: "Constitution",
  sop: "SOP",
  record: "Record",
  publicity: "Publicity asset",
  other: "Other",
};

export function UploadDocumentModal({
  open,
  onClose,
  onUploaded,
  defaultKind = "record",
  folder,
  title = "Upload document",
  allowedKinds,
}: Props) {
  const { user } = useAuth();
  const [docTitle, setDocTitle] = useState("");
  const [description, setDescription] = useState("");
  const [kind, setKind] = useState<DocumentKind>(defaultKind);
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const kindOptions = allowedKinds ?? (Object.keys(KIND_LABELS) as DocumentKind[]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user) {
      toast.error("Not signed in.");
      return;
    }
    if (!file) {
      toast.error("Choose a file to upload.");
      return;
    }
    if (!docTitle.trim()) {
      toast.error("Add a title.");
      return;
    }

    setSubmitting(true);

    // 1. Upload to Storage. We namespace by folder + uuid to avoid collisions.
    const ext = file.name.includes(".")
      ? file.name.slice(file.name.lastIndexOf("."))
      : "";
    const id = crypto.randomUUID();
    const folderPrefix = folder ? `${folder}/` : `${kind}/`;
    const storagePath = `${folderPrefix}${id}${ext}`;

    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type || undefined,
      });

    if (uploadError) {
      setSubmitting(false);
      console.error("[storage] upload failed:", uploadError);
      if (/bucket/i.test(uploadError.message) && /not found/i.test(uploadError.message)) {
        toast.error(
          "Storage bucket missing. Re-run supabase/schema.sql to create the chapter-records bucket."
        );
      } else if (/policy|denied/i.test(uploadError.message)) {
        toast.error(
          "Storage RLS denied. Re-run supabase/policies.sql, then sign out and back in."
        );
      } else {
        toast.error(uploadError.message);
      }
      return;
    }

    // 2. Insert metadata row.
    const { error: insertError } = await supabase.from("documents").insert({
      title: docTitle.trim(),
      description: description.trim() || null,
      kind,
      storage_path: storagePath,
      mime_type: file.type || null,
      size_bytes: file.size,
      uploaded_by: user.id,
    });

    setSubmitting(false);

    if (insertError) {
      // Roll the storage upload back so we don't leak orphan files.
      await supabase.storage.from(STORAGE_BUCKET).remove([storagePath]);
      console.error("[documents] insert failed:", insertError);
      toast.error(insertError.message);
      return;
    }

    toast.success("Uploaded.");
    setDocTitle("");
    setDescription("");
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    onUploaded?.();
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      width="md"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button form="upload-doc-form" type="submit" isLoading={submitting}>
            <UploadCloud size={14} /> Upload
          </Button>
        </div>
      }
    >
      <form id="upload-doc-form" onSubmit={onSubmit} className="space-y-4">
        <Input
          label="Title"
          value={docTitle}
          onChange={(e) => setDocTitle(e.target.value)}
          placeholder="e.g. FA25 Risk Management SOP"
        />
        <Textarea
          label="Description"
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional context for whoever opens this later."
        />
        {kindOptions.length > 1 && (
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-lphie-ink/70">
              Kind
            </span>
            <select
              className="h-10 w-full rounded-lg border border-lphie-ink/15 bg-white px-3 text-sm focus:border-lphie-gold focus:outline-none focus:ring-2 focus:ring-lphie-gold/30"
              value={kind}
              onChange={(e) => setKind(e.target.value as DocumentKind)}
            >
              {kindOptions.map((k) => (
                <option key={k} value={k}>
                  {KIND_LABELS[k]}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-lphie-ink/70">
            File
          </span>
          <input
            ref={fileInputRef}
            type="file"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm text-lphie-ink/70 file:mr-3 file:rounded-lg file:border file:border-lphie-ink/15 file:bg-white file:px-3 file:py-2 file:text-sm file:font-semibold file:text-lphie-ink hover:file:bg-lphie-cream"
          />
          {file && (
            <p className="mt-1 text-xs text-lphie-ink/60">
              {file.name} · {(file.size / 1024).toFixed(1)} KB
            </p>
          )}
        </label>
      </form>
    </Modal>
  );
}
