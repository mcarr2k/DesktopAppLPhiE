import { z } from "zod";

const schema = z.object({
  VITE_SUPABASE_URL: z.string().url("VITE_SUPABASE_URL must be a valid URL"),
  VITE_SUPABASE_ANON_KEY: z
    .string()
    .min(
      20,
      "VITE_SUPABASE_ANON_KEY looks too short — copy it from Supabase Settings → API"
    ),
  VITE_BOOTSTRAP_PRESIDENT_EMAIL: z
    .string()
    .email()
    .optional()
    .or(z.literal("")),
});

const PLACEHOLDERS = new Set([
  "https://your-project-ref.supabase.co",
  "your-anon-public-key",
  "your-email@vt.edu",
]);

const raw = import.meta.env;
const parsed = schema.safeParse(raw);

export const envValid =
  parsed.success &&
  !PLACEHOLDERS.has(raw.VITE_SUPABASE_URL ?? "") &&
  !PLACEHOLDERS.has(raw.VITE_SUPABASE_ANON_KEY ?? "");

export const envErrors: string[] = (() => {
  if (!parsed.success) {
    return Object.entries(parsed.error.flatten().fieldErrors).flatMap(
      ([field, msgs]) => (msgs ?? []).map((m) => `${field}: ${m}`)
    );
  }
  const errs: string[] = [];
  if (PLACEHOLDERS.has(raw.VITE_SUPABASE_URL ?? "")) {
    errs.push("VITE_SUPABASE_URL is still the placeholder value");
  }
  if (PLACEHOLDERS.has(raw.VITE_SUPABASE_ANON_KEY ?? "")) {
    errs.push("VITE_SUPABASE_ANON_KEY is still the placeholder value");
  }
  return errs;
})();

export const env = {
  VITE_SUPABASE_URL:
    parsed.success && envValid
      ? parsed.data.VITE_SUPABASE_URL
      : "https://placeholder.supabase.co",
  VITE_SUPABASE_ANON_KEY:
    parsed.success && envValid
      ? parsed.data.VITE_SUPABASE_ANON_KEY
      : "placeholder-anon-key-not-real-not-real",
  VITE_BOOTSTRAP_PRESIDENT_EMAIL:
    (parsed.success
      ? parsed.data.VITE_BOOTSTRAP_PRESIDENT_EMAIL
      : undefined) ?? "",
};

export const bootstrapPresidentEmail =
  env.VITE_BOOTSTRAP_PRESIDENT_EMAIL.toLowerCase();

if (!envValid) {
  console.warn(
    "[lphie] Environment is not configured yet. Showing setup screen.",
    envErrors
  );
}
