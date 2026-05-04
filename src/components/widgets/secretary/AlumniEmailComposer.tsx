import { useEffect, useState } from "react";
import { Plus, Trash2, Send, Copy } from "lucide-react";
import { Widget } from "@/components/shell/Widget";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { toast } from "@/components/ui/Toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { MinutesEditor } from "@/components/minutes/MinutesEditor";
import { format, parseISO } from "date-fns";
import type { AlumniEmail } from "@/types/db";

export function AlumniEmailComposer({
  colSpan = 12,
}: {
  colSpan?: 4 | 6 | 8 | 12;
}) {
  const [emails, setEmails] = useState<AlumniEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<AlumniEmail | null>(null);
  const [creating, setCreating] = useState(false);

  async function refetch() {
    setLoading(true);
    const { data } = await supabase
      .from("alumni_emails")
      .select("*")
      .order("send_month", { ascending: false });
    setEmails((data ?? []) as AlumniEmail[]);
    setLoading(false);
  }

  useEffect(() => {
    refetch();
  }, []);

  // Reminder banner: have we sent one this month?
  const thisMonth = format(new Date(), "yyyy-MM-01");
  const sentThisMonth = emails.find(
    (e) => e.send_month === thisMonth && e.sent_at
  );

  return (
    <Widget
      title="Alumni email composer"
      subtitle="Monthly digest to alumni — recommended to send the 1st of each month"
      colSpan={colSpan}
      actions={
        <Button size="sm" onClick={() => setCreating(true)}>
          <Plus size={14} /> New draft
        </Button>
      }
    >
      {!sentThisMonth && (
        <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm">
          <strong>Reminder:</strong> No alumni email has been sent for{" "}
          {format(new Date(), "MMMM yyyy")}. Click "New draft" to start.
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Spinner />
        </div>
      ) : emails.length === 0 ? (
        <p className="text-sm text-lphie-ink/50">
          No drafts yet. Compose your first monthly alumni email.
        </p>
      ) : (
        <ul className="space-y-2">
          {emails.slice(0, 6).map((e) => (
            <li
              key={e.id}
              className="flex cursor-pointer items-center justify-between rounded-xl border border-lphie-ink/5 bg-white p-4 hover:bg-lphie-cream/50"
              onClick={() => setEditing(e)}
            >
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold">{e.subject}</p>
                  <Badge tone={e.sent_at ? "success" : "gold"}>
                    {e.sent_at ? "Sent" : "Draft"}
                  </Badge>
                </div>
                <p className="text-xs text-lphie-ink/60">
                  {format(parseISO(e.send_month), "MMMM yyyy")}
                </p>
              </div>
              <span className="text-sm text-lphie-ink/40">Open</span>
            </li>
          ))}
        </ul>
      )}

      <ComposerModal
        email={editing}
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

function ComposerModal({
  email,
  creating,
  onClose,
}: {
  email: AlumniEmail | null;
  creating: boolean;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const open = !!email || creating;
  const [subject, setSubject] = useState("");
  const [sendMonth, setSendMonth] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (email) {
      setSubject(email.subject);
      setSendMonth(email.send_month.slice(0, 7));
      setBodyHtml(email.body_html);
    } else {
      const now = new Date();
      const month = format(now, "MMMM yyyy");
      setSubject(`Beta Zeta Brotherhood — ${month} Update`);
      setSendMonth(format(now, "yyyy-MM"));
      setBodyHtml(
        `<p>Dear Brothers,</p><p>Here's what's been happening at Beta Zeta this month:</p><h3>Recent events</h3><ul><li>—</li></ul><h3>Upcoming</h3><ul><li>—</li></ul><h3>Acknowledgments</h3><ul><li>—</li></ul><p>In the bond,<br>Beta Zeta E-Board</p>`
      );
    }
  }, [open, email]);

  async function save(markSent = false) {
    if (!user) return;
    if (!subject.trim()) {
      toast.error("Add a subject line.");
      return;
    }
    setSubmitting(true);
    const payload: Record<string, unknown> = {
      subject: subject.trim(),
      send_month: `${sendMonth}-01`,
      body_html: bodyHtml,
      composed_by: user.id,
    };
    if (markSent) payload.sent_at = new Date().toISOString();
    const { error } = email
      ? await supabase.from("alumni_emails").update(payload).eq("id", email.id)
      : await supabase.from("alumni_emails").insert(payload);
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(markSent ? "Marked as sent." : "Saved.");
    onClose();
  }

  async function copyToClipboard() {
    try {
      const blob = new Blob([bodyHtml], { type: "text/html" });
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/html": blob,
          "text/plain": new Blob(
            [bodyHtml.replace(/<[^>]+>/g, "")],
            { type: "text/plain" }
          ),
        }),
      ]);
      toast.success("Copied — paste into your email client.");
    } catch {
      // Fallback to plain text
      try {
        await navigator.clipboard.writeText(bodyHtml.replace(/<[^>]+>/g, ""));
        toast.success("Copied as plain text.");
      } catch {
        toast.error("Couldn't copy. Select and copy manually.");
      }
    }
  }

  async function remove() {
    if (!email) return;
    if (!confirm("Delete this draft?")) return;
    const { error } = await supabase
      .from("alumni_emails")
      .delete()
      .eq("id", email.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Deleted.");
      onClose();
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={creating ? "New alumni email" : email?.subject ?? "Email"}
      width="lg"
      footer={
        <div className="flex justify-between">
          <div className="flex gap-2">
            {email && (
              <Button variant="danger" size="sm" onClick={remove}>
                <Trash2 size={14} /> Delete
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="secondary" onClick={copyToClipboard}>
              <Copy size={14} /> Copy HTML
            </Button>
            <Button onClick={() => save(false)} isLoading={submitting}>
              Save draft
            </Button>
            {email && !email.sent_at && (
              <Button onClick={() => save(true)} variant="primary">
                <Send size={14} /> Mark sent
              </Button>
            )}
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <Input
            label="Subject"
            className="col-span-2"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
          <Input
            label="Send month"
            type="month"
            value={sendMonth}
            onChange={(e) => setSendMonth(e.target.value)}
          />
        </div>
        <MinutesEditor
          value={bodyHtml}
          onChange={(html) => setBodyHtml(html)}
        />
        <p className="text-xs text-lphie-ink/50">
          Tip: "Copy HTML" puts a rich-formatted version of the email on your
          clipboard. Paste into Gmail/Outlook and send to your alumni list.
        </p>
      </div>
    </Modal>
  );
}
