/**
 * Helpers to build payment deep-links for Venmo and (since Zelle has no
 * link scheme) format the Zelle handle for copy-paste.
 *
 * Reality check, recorded so future-us doesn't relitigate it:
 * - Venmo has NO public peer-to-peer API. The web URL below is the
 *   officially supported way to open a "send money" prompt on desktop
 *   (browser → Venmo web) or mobile (deep link → Venmo app).
 * - Zelle has NO public API and NO link scheme. Users must open their
 *   bank's app and paste the destination handle. We surface the handle
 *   with a copy button — that's the best UX possible.
 */

const VENMO_WEB = "https://venmo.com";

/** Build a Venmo "send money" URL, prefilled with amount and note. */
export function buildVenmoUrl(opts: {
  handle: string;
  amountCents: number;
  note?: string;
}): string {
  const handle = opts.handle.replace(/^@/, "").trim();
  const amount = (opts.amountCents / 100).toFixed(2);
  const params = new URLSearchParams({
    txn: "pay",
    amount,
    ...(opts.note ? { note: opts.note } : {}),
  });
  // The /u/{handle} form is the cleanest entry point. Venmo also accepts
  // /{handle}, but /u/ is the canonical profile URL pattern.
  return `${VENMO_WEB}/u/${encodeURIComponent(handle)}?${params.toString()}`;
}

/** Strip a leading @, normalize whitespace. */
export function formatVenmoHandle(handle: string | null | undefined): string {
  if (!handle) return "";
  return handle.trim().replace(/^@/, "");
}

/** Heuristic to guess if a Zelle handle is a phone vs an email. */
export function describeZelleHandle(
  handle: string | null | undefined
): "phone" | "email" | "unknown" {
  if (!handle) return "unknown";
  const cleaned = handle.trim();
  if (/^[+0-9().\- ]+$/.test(cleaned)) return "phone";
  if (cleaned.includes("@")) return "email";
  return "unknown";
}
