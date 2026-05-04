import { useMemo, useState, useEffect } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { EventInput } from "@fullcalendar/core";
import { useEvents } from "@/hooks/useEvents";
import { useCalendarStore } from "@/stores/calendarStore";
import { EventModal } from "./EventModal";
import { VisibilityFilter } from "./VisibilityFilter";
import { Button } from "@/components/ui/Button";
import { Plus } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import type { ChapterEvent, EventVisibility } from "@/types/db";

export function CalendarView() {
  const { events, loading } = useEvents();
  const { visibilityFilter } = useCalendarStore();
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
    if (visibilityFilter === "all") return events;
    return events.filter((e) => e.visibility === visibilityFilter);
  }, [events, visibilityFilter]);

  const fcEvents: EventInput[] = useMemo(
    () =>
      filtered.map((e) => ({
        id: e.id,
        title: e.title,
        start: e.starts_at,
        end: e.ends_at,
        backgroundColor:
          e.visibility === "eboard_only" ? "#C8A028" : "#0E7490",
        borderColor:
          e.visibility === "eboard_only" ? "#A88420" : "#0E7490",
        textColor: e.visibility === "eboard_only" ? "#0A0A0A" : "#FFFFFF",
        extendedProps: { record: e },
      })),
    [filtered]
  );

  return (
    <div className="p-8">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">Chapter Calendar</h1>
          <p className="text-sm text-lphie-ink/60">
            Global events are visible to every brother. E-board-only events
            stay between officers.
          </p>
        </div>
        <div className="flex items-center gap-3">
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

      <div className="rounded-2xl border border-lphie-ink/5 bg-white p-4 shadow-widget">
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right: "dayGridMonth,timeGridWeek,timeGridDay",
          }}
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
