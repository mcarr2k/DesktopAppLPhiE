# Supabase Setup

## One-time setup (5 minutes)

1. Go to <https://supabase.com>, sign up (free), and create a new project named e.g. `lphie-bz-dashboard`. Pick the region closest to Virginia (`us-east-1`).
2. Wait ~1 minute for provisioning, then open **Settings → API**. Copy:
   - **Project URL** → goes into `.env` as `VITE_SUPABASE_URL`
   - **anon public** key → goes into `.env` as `VITE_SUPABASE_ANON_KEY`
3. Open the **SQL Editor** in the left sidebar.
4. Paste the entire contents of `schema.sql`, click **Run**.
5. Paste the entire contents of `policies.sql`, click **Run**.
6. Open **Authentication → Providers → Email** and enable email confirmation if desired (or disable for faster onboarding during initial chapter rollout).
7. (Optional) **Authentication → URL Configuration** — add `http://localhost:5173` to "Site URL" and "Redirect URLs" so dev sign-up emails work.

## How auth bootstraps

Set `VITE_BOOTSTRAP_PRESIDENT_EMAIL` in your `.env`. The first user who signs up with that email is auto-promoted to `president` so the chapter can self-onboard. After that, the President assigns roles via the in-app directory.

## Verifying RLS

In a SQL editor query window, run as different users:

```sql
-- as the anon (no JWT) — should return 0 rows
select count(*) from events;

-- after signing in via the app, the JS client sends a JWT and
-- the policies above filter to (visibility='global' or is_eboard()).
```
