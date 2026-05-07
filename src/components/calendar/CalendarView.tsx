import { useMemo, useState, useEffect } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { EventInput } from "@fullcalendar/core";
import { useEvents } from "@/hooks/useEvents";
import { useEventCategories } from "@/hooks/useEventCategories";
import {
  useCalendarStore,
  UNCATEGORIZED_FILTER_KEY,
} from "@/stores/calendarStore";
import { EventModal } from "./EventModal";
import { VisibilityFilter } from "./VisibilityFilter";
import { CategoryLegend } from "./CategoryLegend";
import { Button } from "@/components/ui/Button";
import { Plus } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import type { ChapterEvent, EventVisibility } from "@/types/db";

const FALLBACK_GLOBAL = "#0E7490";
const FALLBACK_EBOARD = "#C8A028";

/**
 * Picks a readable text color (black or white) for a given background.
 * Simple luminance heuristic — good enough for chip-style events.
 */
function readableTextColor(hex: string): string {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return "#FFFFFF";
  const v = parseInt(m[1], 16);
  const r = (v >> 16) & 0xff;
  const g = (v >> 8) & 0xff;
  const b = v & 0xff;
  // Perceived luminance
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.6 ? "#0A0A0A" : "#FFFFFF";
}

export function CalendarView() {
  const { events, loading } = useEvents();
  const { categories, findById } = useEventCategories();
  const { visibilityFilter, hiddenCategories } = useCalendarStore();
  const { isEboard } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ChapterEvent | null>(null);
  const [initial, setInitial] = useState<
    Partial<ChapterEvent> & { starts_at?: string; ends_at?: string }
  >();

  useEffect(() => {
    function handler(e: Event) {
      const detail = (e as CustomEvent).detail as
        | { visibility?: EventVisibility }
        | undefined;
      setEditing(null);
      setInitial({ visibility: detail?.visibility ?? "global" });
      setModalOpen(true);
    }
    window.addEventListener("lphie:new-event", handler);
    return () => window.removeEventListener("lphie:new-event", handler);
  }, []);

  const filtered = useMemo(() => {
    return events.filter((e) => {
      if (visibilityFilter !== "all" && e.visibility !== visibilityFilter)
        return false;
      const key = e.category_id ?? UNCATEGORIZED_FILTER_KEY;
      if (hiddenCategories.includes(key)) return false;
      return true;
    });
  }, [events, visibilityFilter, hiddenCategories]);

  const fcEvents: EventInput[] = useMemo(
    () =>
      filtered.map((e) => {
        const cat = findById(e.category_id);
        const baseColor =
          cat?.color ??
          (e.visibility === "eboard_only" ? FALLBACK_EBOARD : FALLBACK_GLOBAL);
        // E-board-only events get a dashed gold outline so visibility
        // is distinguishable even when the category color matches a
        // global event with the same category.
        const isEboardOnly = e.visibility === "eboard_only";
        return {
          id: e.id,
          title: e.title,
          start: e.starts_at,
          end: e.ends_at,
          backgroundColor: baseColor,
          borderColor: isEboardOnly ? "#C8A028" : baseColor,
          textColor: readableTextColor(baseColor),
          classNames: isEboardOnly ? ["fc-event-eboard"] : [],
          extendedProps: { record: e, category: cat ?? null },
        };
      }),
    [filtered, findById]
  );

  // FullCalendar's default headerToolbar is too crowded on phones.
  // Use a narrow-friendly toolbar below 640px.
  const isNarrow =
    typeof window !== "undefined" && window.matchMedia("(max-width: 640px)").matches;

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold sm:text-3xl">
            Chapter Calendar
          </h1>
          <p className="text-xs text-lphie-ink/60 sm:text-sm">
            Color-coded by category. Toggle categories below to focus.
            E-board-only events have a dashed gold outline.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {isEboard && <VisibilityFilter />}
          <Button
            onClick={() => {
              setEditing(null);
              setInitial(undefined);
              setModalOpen(true);
            }}
          >
            <Plus size={16} /> New event
          </Button>
        </div>
      </header>

      {categories.length > 0 && (
        <div className="mb-4">
          <CategoryLegend />
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-lphie-ink/5 bg-white p-2 shadow-widget sm:p-4">
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView={isNarrow ? "timeGridDay" : "dayGridMonth"}
          headerToolbar={
            isNarrow
              ? {
                  left: "prev,next",
                  center: "title",
                  right: "today",
                }
              : {
                  left: "prev,next today",
                  center: "title",
                  right: "dayGridMonth,timeGridWeek,timeGridDay",
                }
          }
          footerToolbar={
            isNarrow
              ? { center: "dayGridMonth,timeGridWeek,timeGridDay" }
              : false
          }
          height="auto"
          events={fcEvents}
          selectable
          selectMirror
          dayMaxEvents
          select={(info) => {
            setEditing(null);
            setInitial({
              starts_at: info.start.toISOString(),
              ends_at: info.end.toISOString(),
            });
            setModalOpen(true);
          }}
          eventClick={(info) => {
            const record = info.event.extendedProps.record as ChapterEvent;
            setEditing(record);
            setInitial(undefined);
            setModalOpen(true);
          }}
        />
        {loading && <p className="pt-3 text-xs text-lphie-ink/40">Loading…</p>}
      </div>

      <EventModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        initial={initial}
        editing={editing}
      />
    </div>
  );
}
