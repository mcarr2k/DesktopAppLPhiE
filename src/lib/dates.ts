import { format, parseISO } from "date-fns";

export function currentSemester(now = new Date()): string {
  const month = now.getMonth() + 1;
  const yy = String(now.getFullYear()).slice(2);
  return month >= 7 ? `FA${yy}` : `SP${yy}`;
}

export function formatDateTime(iso: string): string {
  return format(parseISO(iso), "EEE, MMM d, yyyy h:mm a");
}

export function formatDate(iso: string): string {
  return format(parseISO(iso), "MMM d, yyyy");
}

export function formatTime(iso: string): string {
  return format(parseISO(iso), "h:mm a");
}

export function toIsoLocal(date: Date): string {
  const tzOffset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
}
