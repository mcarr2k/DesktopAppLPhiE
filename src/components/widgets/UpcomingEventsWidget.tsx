import { Widget } from "@/components/shell/Widget";
import { useEvents } from "@/hooks/useEvents";
import { Badge } from "@/components/ui/Badge";
import { formatDateTime } from "@/lib/dates";

export function UpcomingEventsWidget({ colSpan = 6 }: { colSpan?: 4 | 6 | 8 | 12 }) {
  const { events } = useEvents();
  const upcoming = events
    .filter((e) => new Date(e.starts_at) >= new Date())
    .slice(0, 5);

  return (
    <Widget title="Upcoming events" subtitle="Next 5 on the calendar" colSpan={colSpan}>
      {upcoming.length === 0 ? (
        <p className="text-sm text-lphie-ink/50">Nothing scheduled.</p>
      ) : (
        <ul className="divide-y divide-lphie-ink/5">
          {upcoming.map((e) => (
            <li key={e.id} className="flex items-start justify-between py-2">
              <div>
                <p className="font-semibold">{e.title}</p>
                <p className="text-xs text-lphie-ink/60">
                  {formatDateTime(e.starts_at)}
                  {e.location && ` · ${e.location}`}
                </p>
              </div>
              <Badge tone={e.visibility === "eboard_only" ? "gold" : "neutral"}>
                {e.visibility === "eboard_only" ? "E-Board" : "Global"}
              </Badge>
            </li>
          ))}
        </ul>
      )}
    </Widget>
  );
}
