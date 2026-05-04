import { useEffect, useState } from "react";
import { Plus, Trash2, Mail, Phone, Pencil } from "lucide-react";
import { Widget } from "@/components/shell/Widget";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Spinner } from "@/components/ui/Spinner";
import { toast } from "@/components/ui/Toast";
import { useLiaisons } from "@/hooks/useLiaisons";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import type { LiaisonContact } from "@/types/db";

export function LiaisonContacts({
  colSpan = 12,
}: {
  colSpan?: 4 | 6 | 8 | 12;
}) {
  const { contacts, loading, refetch } = useLiaisons();
  const { role } = useAuth();
  const canEdit = role === "vp_external" || role === "president";
  const [editing, setEditing] = useState<LiaisonContact | null>(null);
  const [creating, setCreating] = useState(false);

  return (
    <Widget
      title="Liaison contacts"
      subtitle="Primary point-of-contact at every Greek org we work with"
      colSpan={colSpan}
      actions={
        canEdit && (
          <Button size="sm" onClick={() => setCreating(true)}>
            <Plus size={14} /> Add contact
          </Button>
        )
      }
    >
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Spinner />
        </div>
      ) : contacts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-lphie-ink/15 bg-lphie-cream/40 p-6 text-center text-sm text-lphie-ink/60">
          No contacts yet. {canEdit && "Click \"Add contact\" to log your first one."}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {contacts.map((c) => (
            <ContactCard
              key={c.id}
              contact={c}
              canEdit={canEdit}
              onEdit={() => setEditing(c)}
              onDelete={async () => {
                if (!confirm(`Delete ${c.contact_name} (${c.organization})?`))
                  return;
                const { error } = await supabase
                  .from("liaison_contacts")
                  .delete()
                  .eq("id", c.id);
                if (error) toast.error(error.message);
                else {
                  toast.success("Deleted.");
                  refetch();
                }
              }}
            />
          ))}
        </div>
      )}

      <ContactModal
        contact={editing}
        creating={creating}
        onClose={() => {
          setEditing(null);
          setCreating(false);
          refetch();
        }}
      />
    </Widget>
  );
}

function ContactCard({
  contact,
  canEdit,
  onEdit,
  onDelete,
}: {
  contact: LiaisonContact;
  canEdit: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="rounded-xl border border-lphie-ink/5 bg-white p-4 shadow-widget">
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="font-display text-base font-semibold">
            {contact.organization}
          </p>
          <p className="text-sm text-lphie-ink/80">
            {contact.contact_name}
            {contact.contact_role && (
              <span className="text-lphie-ink/50"> · {contact.contact_role}</span>
            )}
          </p>
          <div className="mt-2 space-y-1 text-xs text-lphie-ink/70">
            {contact.email && (
              <p className="flex items-center gap-1.5">
                <Mail size={11} />
                <a
                  href={`mailto:${contact.email}`}
                  className="hover:underline"
                >
                  {contact.email}
                </a>
              </p>
            )}
            {contact.phone && (
              <p className="flex items-center gap-1.5">
                <Phone size={11} />
                {contact.phone}
              </p>
            )}
          </div>
          {contact.notes && (
            <p className="mt-2 text-xs text-lphie-ink/60">{contact.notes}</p>
          )}
        </div>
        {canEdit && (
          <div className="flex flex-col items-end gap-1">
            <button
              onClick={onEdit}
              className="rounded p-1 text-lphie-ink/40 hover:bg-lphie-ink/5 hover:text-lphie-ink"
              aria-label="Edit"
            >
              <Pencil size={14} />
            </button>
            <button
              onClick={onDelete}
              className="rounded p-1 text-lphie-ink/40 hover:bg-rose-50 hover:text-rose-700"
              aria-label="Delete"
            >
              <Trash2 size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function ContactModal({
  contact,
  creating,
  onClose,
}: {
  contact: LiaisonContact | null;
  creating: boolean;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const open = !!contact || creating;
  const [organization, setOrganization] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactRole, setContactRole] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setOrganization(contact?.organization ?? "");
    setContactName(contact?.contact_name ?? "");
    setContactRole(contact?.contact_role ?? "");
    setEmail(contact?.email ?? "");
    setPhone(contact?.phone ?? "");
    setNotes(contact?.notes ?? "");
  }, [open, contact]);

  async function save() {
    if (!user) return;
    if (!organization.trim() || !contactName.trim()) {
      toast.error("Organization and contact name are required.");
      return;
    }
    setSubmitting(true);
    const payload = {
      organization: organization.trim(),
      contact_name: contactName.trim(),
      contact_role: contactRole.trim() || null,
      email: email.trim() || null,
      phone: phone.trim() || null,
      notes: notes.trim() || null,
      created_by: user.id,
    };
    const { error } = contact
      ? await supabase
          .from("liaison_contacts")
          .update(payload)
          .eq("id", contact.id)
      : await supabase.from("liaison_contacts").insert(payload);
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Saved.");
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={creating ? "New contact" : "Edit contact"}
      width="md"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} isLoading={submitting}>
            Save
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input
            label="Organization"
            value={organization}
            onChange={(e) => setOrganization(e.target.value)}
            placeholder="e.g. Sigma Phi Epsilon"
          />
          <Input
            label="Contact name"
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
          />
        </div>
        <Input
          label="Contact role"
          value={contactRole}
          onChange={(e) => setContactRole(e.target.value)}
          placeholder="e.g. Social Chair"
        />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            label="Phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>
        <Textarea
          label="Notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="History, scheduling preferences, anything useful."
        />
      </div>
    </Modal>
  );
}
