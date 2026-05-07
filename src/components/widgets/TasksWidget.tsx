import { useMemo, useState } from "react";
import {
  CheckCircle2,
  Circle,
  Clock,
  Plus,
  Loader2,
  AlertCircle,
  AlertTriangle,
  Trash2,
} from "lucide-react";
import { Widget } from "@/components/shell/Widget";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { toast } from "@/components/ui/Toast";
import { Spinner } from "@/components/ui/Spinner";
import { useTasks } from "@/hooks/useTasks";
import { useDirectory } from "@/hooks/useDirectory";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { formatDate } from "@/lib/dates";
import { effectiveTitles } from "@/lib/titles";
import type { Task, TaskPriority, TaskStatus } from "@/types/db";
import type { Role } from "@/types/role";

type Mode = "assigned-by-me" | "assigned-to-me";

interface Props {
  /** "assigned-by-me" = tasks I delegated. "assigned-to-me" = my inbox. */
  mode: Mode;
  /** Pre-fill the related-role tag when an officer creates a task. */
  defaultRelatedRole?: Role;
  /** Pre-fill the category (e.g. "Fundraising"). */
  defaultCategory?: string;
  title?: string;
  subtitle?: string;
  colSpan?: 4 | 6 | 8 | 12;
}

const PRIORITY_TONE: Record<TaskPriority, "neutral" | "gold" | "danger"> = {
  low: "neutral",
  normal: "neutral",
  high: "gold",
  urgent: "danger",
};

const STATUS_ICON: Record<TaskStatus, JSX.Element> = {
  open: <Circle size={14} className="text-lphie-ink/40" />,
  in_progress: <Loader2 size={14} className="text-amber-600" />,
  done: <CheckCircle2 size={14} className="text-emerald-600" />,
  cancelled: <AlertCircle size={14} className="text-rose-500" />,
};

const STATUS_LABEL: Record<TaskStatus, string> = {
  open: "Open",
  in_progress: "In progress",
  done: "Done",
  cancelled: "Cancelled",
};

export function TasksWidget({
  mode,
  defaultRelatedRole,
  defaultCategory,
  title,
  subtitle,
  colSpan = 6,
}: Props) {
  const { user, profile, isEboard } = useAuth();
  const { tasks, loading, error, refetch } = useTasks(
    mode === "assigned-by-me"
      ? { assignedBy: user?.id, status: "open" }
      : { assignedTo: user?.id, status: "open" }
  );
  const [modalOpen, setModalOpen] = useState(false);

  const dbMissing =
    !!error && /relation .*tasks.* does not exist/i.test(error);

  // E-board OR cabinet chair (anyone with at least one title) can
  // delegate, mirroring the tasks_insert_authorized RLS policy.
  const canDelegate =
    isEboard ||
    (profile ? effectiveTitles(profile).length > 0 : false);

  const headerTitle =
    title ?? (mode === "assigned-by-me" ? "Delegated tasks" : "My tasks");
  const headerSubtitle =
    subtitle ??
    (mode === "assigned-by-me"
      ? "Work you've assigned to other brothers"
      : "Open work in your queue");

  return (
    <Widget
      title={headerTitle}
      subtitle={headerSubtitle}
      colSpan={colSpan}
      actions={
        canDelegate && mode === "assigned-by-me" ? (
          <Button size="sm" onClick={() => setModalOpen(true)}>
            <Plus size={14} /> Assign
          </Button>
        ) : undefined
      }
    >
      {dbMissing ? (
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="mb-1 flex items-center gap-2 font-semibold">
            <AlertTriangle size={14} /> Tasks table not set up yet
          </p>
          <p className="text-xs">
            Open Supabase → SQL Editor and re-run the contents of{" "}
            <code>supabase/schema.sql</code> followed by{" "}
            <code>supabase/policies.sql</code>. Both files are idempotent and
            safe to run again.
          </p>
        </div>
      ) : error ? (
        <div className="rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-900">
          <p className="mb-1 flex items-center gap-2 font-semibold">
            <AlertTriangle size={14} /> Couldn't load tasks
          </p>
          <p className="text-xs font-mono">{error}</p>
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center py-6">
          <Spinner />
        </div>
      ) : tasks.length === 0 ? (
        <p className="text-sm text-lphie-ink/50">
          {mode === "assigned-by-me"
            ? "No open assignments. Click Assign to delegate work."
            : "Nothing on your plate. 🎉"}
        </p>
      ) : (
        <ul className="divide-y divide-lphie-ink/5">
          {tasks.map((t) => (
            <TaskRow key={t.id} task={t} mode={mode} onChanged={refetch} />
          ))}
        </ul>
      )}

      <AssignTaskModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onAssigned={refetch}
        defaultRelatedRole={defaultRelatedRole}
        defaultCategory={defaultCategory}
      />
    </Widget>
  );
}

function TaskRow({
  task,
  mode,
  onChanged,
}: {
  task: Task;
  mode: Mode;
  onChanged?: () => void;
}) {
  const { user, isEboard } = useAuth();
  const { members } = useDirectory();
  const [busy, setBusy] = useState(false);

  const assignee = members.find((m) => m.id === task.assigned_to);
  const assigner = members.find((m) => m.id === task.assigned_by);

  const canAdvance = task.assigned_to === user?.id;
  const canDelete = task.assigned_by === user?.id || isEboard;

  async function setStatus(next: TaskStatus) {
    setBusy(true);
    const { error } = await supabase
      .from("tasks")
      .update({ status: next })
      .eq("id", task.id);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    onChanged?.();
  }

  async function remove() {
    if (!confirm(`Delete task "${task.title}"?`)) return;
    setBusy(true);
    const { error } = await supabase.from("tasks").delete().eq("id", task.id);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    onChanged?.();
  }

  return (
    <li className="flex items-start justify-between gap-3 py-2.5 text-sm">
      <button
        className="mt-0.5 shrink-0 disabled:opacity-50"
        disabled={!canAdvance || busy}
        onClick={() =>
          setStatus(task.status === "done" ? "open" : "done")
        }
        aria-label={`Mark ${STATUS_LABEL[task.status]}`}
      >
        {STATUS_ICON[task.status]}
      </button>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p
            className={`font-semibold ${
              task.status === "done" ? "line-through opacity-60" : ""
            }`}
          >
            {task.title}
          </p>
          {task.priority !== "normal" && (
            <Badge tone={PRIORITY_TONE[task.priority]}>{task.priority}</Badge>
          )}
        </div>
        {task.description && (
          <p className="mt-0.5 text-xs text-lphie-ink/60">
            {task.description}
          </p>
        )}
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-lphie-ink/50">
          {mode === "assigned-by-me" && assignee && (
            <span>→ {assignee.full_name}</span>
          )}
          {mode === "assigned-to-me" && assigner && (
            <span>from {assigner.full_name}</span>
          )}
          {task.due_date && (
            <span className="inline-flex items-center gap-1">
              <Clock size={11} />
              due {formatDate(task.due_date)}
            </span>
          )}
          {task.category && <span>· {task.category}</span>}
        </div>
      </div>
      <div className="flex items-center gap-1">
        {canAdvance && task.status === "open" && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setStatus("in_progress")}
            disabled={busy}
          >
            Start
          </Button>
        )}
        {canDelete && (
          <button
            onClick={remove}
            disabled={busy}
            className="rounded p-1 text-lphie-ink/40 hover:bg-rose-50 hover:text-rose-700 disabled:opacity-50"
            aria-label="Delete task"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>
    </li>
  );
}

function AssignTaskModal({
  open,
  onClose,
  onAssigned,
  defaultRelatedRole,
  defaultCategory,
}: {
  open: boolean;
  onClose: () => void;
  /** Called after a successful insert so the list refreshes immediately,
   *  even if Supabase Realtime isn't subscribed for the tasks table. */
  onAssigned?: () => void;
  defaultRelatedRole?: Role;
  defaultCategory?: string;
}) {
  const { user } = useAuth();
  const { members } = useDirectory();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("normal");
  const [dueDate, setDueDate] = useState("");
  const [category, setCategory] = useState(defaultCategory ?? "");
  const [submitting, setSubmitting] = useState(false);

  const eligible = useMemo(
    () =>
      members.filter(
        (m) => m.status === "active" || m.status === "pledge"
      ),
    [members]
  );

  async function onSubmit() {
    if (!user) {
      toast.error("Not signed in.");
      return;
    }
    if (!title.trim()) {
      toast.error("Add a title for the task.");
      return;
    }
    if (!assignedTo) {
      toast.error("Pick a brother to assign this to.");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("tasks").insert({
      title: title.trim(),
      description: description.trim() || null,
      assigned_to: assignedTo,
      assigned_by: user.id,
      priority,
      due_date: dueDate || null,
      category: category.trim() || null,
      related_role: defaultRelatedRole ?? null,
    });
    setSubmitting(false);
    if (error) {
      console.error("[tasks] insert failed:", error);
      // Translate the most common failures into something actionable.
      if (error.code === "42P01") {
        toast.error(
          "The 'tasks' table doesn't exist yet. Re-run supabase/schema.sql in the Supabase SQL editor."
        );
      } else if (error.code === "42501" || /row-level security/i.test(error.message)) {
        toast.error(
          "RLS denied this insert. Re-run supabase/policies.sql, then sign out and back in."
        );
      } else if (/violates foreign key/i.test(error.message)) {
        toast.error("Selected brother no longer exists in the directory.");
      } else {
        toast.error(`Insert failed: ${error.message}`);
      }
      return;
    }
    toast.success("Task assigned.");
    setTitle("");
    setDescription("");
    setAssignedTo("");
    setPriority("normal");
    setDueDate("");
    setCategory(defaultCategory ?? "");
    // Don't depend on Supabase Realtime to reflect the new row —
    // some installs forgot to add `tasks` to the supabase_realtime
    // publication, in which case the list would silently never update.
    onAssigned?.();
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Assign a task"
      width="md"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onSubmit} isLoading={submitting}>
            Assign
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <Input
          label="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Run Chipotle fundraiser Friday"
        />
        <Textarea
          label="Details"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Anything specific the assignee should know."
        />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-lphie-ink/70">
              Assign to
            </span>
            <select
              className="h-10 w-full rounded-lg border border-lphie-ink/15 bg-white px-3 text-sm focus:border-lphie-gold focus:outline-none focus:ring-2 focus:ring-lphie-gold/30"
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
            >
              <option value="">— select brother —</option>
              {eligible.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.full_name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-lphie-ink/70">
              Priority
            </span>
            <select
              className="h-10 w-full rounded-lg border border-lphie-ink/15 bg-white px-3 text-sm focus:border-lphie-gold focus:outline-none focus:ring-2 focus:ring-lphie-gold/30"
              value={priority}
              onChange={(e) => setPriority(e.target.value as TaskPriority)}
            >
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </label>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input
            label="Due date"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
          <Input
            label="Category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="e.g. Fundraising, Risk, PR"
          />
        </div>
      </div>
    </Modal>
  );
}
