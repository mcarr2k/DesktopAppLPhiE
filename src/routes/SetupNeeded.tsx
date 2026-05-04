import { AlertTriangle, ExternalLink } from "lucide-react";
import { envErrors } from "@/lib/env";

export default function SetupNeeded() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-lphie-cream p-6">
      <div className="w-full max-w-2xl">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-lphie-gold text-lphie-ink font-display text-xl font-bold">
            ΛΦΕ
          </div>
          <div>
            <h1 className="font-display text-3xl font-bold text-lphie-ink">
              One more step
            </h1>
            <p className="text-sm text-lphie-ink/70">
              Beta Zeta Dashboard needs Supabase credentials before it can
              connect.
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-5 shadow-widget">
          <div className="mb-3 flex items-center gap-2 font-semibold text-amber-900">
            <AlertTriangle size={18} />
            Missing or placeholder environment variables
          </div>
          <ul className="ml-6 list-disc space-y-1 text-sm text-amber-900">
            {envErrors.map((e) => (
              <li key={e} className="font-mono text-xs">
                {e}
              </li>
            ))}
            {envErrors.length === 0 && (
              <li>VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are required.</li>
            )}
          </ul>
        </div>

        <ol className="mt-6 space-y-4 text-sm text-lphie-ink">
          <li className="rounded-2xl border border-lphie-ink/5 bg-white p-5 shadow-widget">
            <p className="mb-2 font-semibold">
              1. Create a free Supabase project
            </p>
            <p className="text-lphie-ink/70">
              Go to{" "}
              <a
                href="https://supabase.com"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 font-semibold text-lphie-accent hover:underline"
              >
                supabase.com <ExternalLink size={12} />
              </a>{" "}
              and create a project. Pick the <code>us-east-1</code> region.
            </p>
          </li>
          <li className="rounded-2xl border border-lphie-ink/5 bg-white p-5 shadow-widget">
            <p className="mb-2 font-semibold">
              2. Copy <code>.env.example</code> to <code>.env</code>
            </p>
            <p className="text-lphie-ink/70">
              In the project root, run:
            </p>
            <pre className="mt-2 overflow-x-auto rounded-lg bg-lphie-ink p-3 font-mono text-xs text-lphie-cream">
              {`cp .env.example .env`}
            </pre>
          </li>
          <li className="rounded-2xl border border-lphie-ink/5 bg-white p-5 shadow-widget">
            <p className="mb-2 font-semibold">
              3. Fill in the three values
            </p>
            <p className="mb-2 text-lphie-ink/70">
              From <strong>Supabase → Settings → API</strong>:
            </p>
            <pre className="overflow-x-auto rounded-lg bg-lphie-ink p-3 font-mono text-xs text-lphie-cream">
              {`VITE_SUPABASE_URL=https://xxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
VITE_BOOTSTRAP_PRESIDENT_EMAIL=you@vt.edu`}
            </pre>
          </li>
          <li className="rounded-2xl border border-lphie-ink/5 bg-white p-5 shadow-widget">
            <p className="mb-2 font-semibold">
              4. Run the SQL migrations
            </p>
            <p className="text-lphie-ink/70">
              In the Supabase <strong>SQL Editor</strong>, paste and run{" "}
              <code>supabase/schema.sql</code>, then{" "}
              <code>supabase/policies.sql</code>.
            </p>
          </li>
          <li className="rounded-2xl border border-lphie-ink/5 bg-white p-5 shadow-widget">
            <p className="mb-2 font-semibold">5. Restart the app</p>
            <p className="text-lphie-ink/70">
              Quit this window and run <code>npm run dev</code> again.
              Vite picks up <code>.env</code> at startup.
            </p>
          </li>
        </ol>

        <p className="mt-6 text-center text-xs text-lphie-ink/50">
          Lambda Phi Epsilon · Beta Zeta · Virginia Tech
        </p>
      </div>
    </div>
  );
}
