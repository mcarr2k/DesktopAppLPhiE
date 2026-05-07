import { useMemo, useState } from "react";
import { CalendarPlus, Briefcase } from "lucide-react";
import { Widget } from "@/components/shell/Widget";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { useAuth } from "@/hooks/useAuth";
import { useEvents } from "@/hooks/useEvents";
import { useEventCategories } from "@/hooks/useEventCategories";
import { useTasks } from "@/hooks/useTasks";
import { useDirectory } from "@/hooks/useDirectory";
import { effectiveTitles } from "@/lib/titles";
import { categoriesForTitles } from "@/types/cabinet";
import { formatDateTime } from "@/lib/dates";
import { EventModal } from "@/components/calendar/EventModal";
import type { ChapterEvent } from "@/types/db";

/**
 * Home-page widget shown only to brothers with cabinet titles.
 * Surfaces:
 *   - upcoming events in the categories tied to their titles
 *   - tasks they've delegated (status: open / in_progress)
 *   - a "Schedule event" CTA pre-tagged with their cabinet category
 */
export function MyCabinetWidget({ colSpan = 12 }: { colSpan?: 4 | 6 | 8 | 12 }) {
  const { user, profile } = useAuth();
  const { events, loading: eventsLoading } = useEvents();
  const { findByName } = useEventCategories();
  const { members } = useDirectory();
  const { tasks, loading: tasksLoading } = useTasks(
    user ? { assignedBy: user.id, status: "open" } : {}
  );
  const [modalOpen, setModalOpen] = useState(false);

  const titles = profile ? effectiveTitles(profile) : [];
  const categoryNames = useMemo(() => categoriesForTitles(titles), [titles]);

  // Find the matching category records and pull just their IDs.
  const categoryIds = useMemo(() => {
    return categoryNames
      .map((n) => findByName(n)?.id)
      .filter((id): id is string => !!id);
  }, [categoryNames, findByName]);

  // Upcoming events whose category falls into our cabinet domain.
  const upcoming = useMemo(() => {
    if (categoryIds.length === 0) return [] as ChapterEvent[];
    const now = new Date();
    return events
      .filter(
        (e) =>
          e.category_id &&
          categoryIds.includes(e.category_id) &&
          new Date(e.starts_at) >= now
      )
      .slice(0, 5);
  }, [events, categoryIds]);

  // Default category for the "Schedule event" button → first match.
  const defaultCategoryId =
    categoryIds[0] ?? findByName("General")?.id ?? null;

  if (titles.length === 0) return null;

  return (
    <>
      <Widget
        title="My cabinet work"
        subtitle={`Tied to: ${titles.join(" · ")}`}
        colSpan={colSpan}
        actions={
          <Button size="sm" onClick={() => setModalOpen(true)}>
            <CalendarPlus size={14} /> Schedule event
          </Button>
        }
      >
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {/* Upcoming domain events */}
          <section>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-lphie-ink/60">
              Upcoming in your area
            </h4>
            {eventsLoading ? (
              <div className="flex items-center justify-center py-4">
                <Spinner />
              </div>
            ) : upcoming.length === 0 ? (
              <p className="text-sm text-lphie-ink/50">
                No events scheduled in{" "}
                {categoryNames.length > 0
                  ? categoryNames.join(" / ")
                  : "your category"}{" "}
                yet. Use "Schedule event" to add one.
              </p>
            ) : (
              <ul className="divide-y divide-lphie-ink/5">
                {upcoming.map((e) => {
                  const cat = findByName(
                    categoryNames.find(
                      (n) => findByName(n)?.id === e.category_id
                    ) ?? ""
                  );
                  return (
                    <li
                      key={e.id}
                      className="flex items-start justify-between gap-3 py-2 text-sm"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold">{e.title}</p>
                        <p className="text-xs text-lphie-ink/60">
                          {formatDateTime(e.starts_at)}
                          {e.location && ` · ${e.location}`}
                        </p>
                      </div>
                      {cat && (
                        <span
                          className="inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold"
                          style={{
                            backgroundColor: `${cat.color}22`,
                            color: cat.color,
                          }}
                        >
                          <span
                            className="h-1.5 w-1.5 rounded-full"
                            style={{ backgroundColor: cat.color }}
                          />
                          {cat.name}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* Tasks I've delegated */}
          <section>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-lphie-ink/60">
              Open work I've delegated
            </h4>
            {tasksLoading ? (
              <div className="flex items-center justify-center py-4">
                <Spinner />
              </div>
            ) : tasks.length === 0 ? (
              <p className="text-sm text-lphie-ink/50">
                You haven't delegated anything yet. Use the Tasks widget below
                to assign work to brothers in your cabinet.
              </p>
            ) : (
              <ul className="divide-y divide-lphie-ink/5">
                {tasks.slice(0, 5).map((t) => {
                  const assignee = members.find((m) => m.id === t.assigned_to);
                  return (
                    <li
                      key={t.id}
                      className="flex items-start justify-between gap-3 py-2 text-sm"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold">{t.title}</p>
                        <p className="text-xs text-lphie-ink/60">
                          <Briefcase size={11} className="-mt-0.5 mr-1 inline" />
                          {assignee?.full_name ?? "—"}
                          {t.category && ` · ${t.category}`}
                        </p>
                      </div>
                      <Badge
                        tone={t.status === "in_progress" ? "gold" : "neutral"}
                      >
                        {t.status === "in_progress"
                          ? "in progress"
                          : t.status}
                      </Badge>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      </Widget>

      <EventModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        initial={
          defaultCategoryId
            ? {
                category_id: defaultCategoryId,
                visibility: "global",
              }
            : { visibility: "global" }
        }
      />
    </>
  );
}
