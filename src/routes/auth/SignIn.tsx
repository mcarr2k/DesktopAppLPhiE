import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { toast } from "@/components/ui/Toast";

export default function SignIn() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const res = await signIn({ email, password });
    setSubmitting(false);
    if (!res.ok) {
      toast.error(res.message ?? "Sign in failed");
      return;
    }
    navigate("/", { replace: true });
  }

  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to the chapter dashboard.">
      <form onSubmit={onSubmit} className="space-y-4">
        <Input
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Input
          label="Password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Button type="submit" size="lg" className="w-full" isLoading={submitting}>
          Sign in
        </Button>
        <p className="pt-2 text-center text-sm text-lphie-ink/70">
          New brother?{" "}
          <Link className="font-semibold text-lphie-accent hover:underline" to="/auth/signup">
            Create an account
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}

export function AuthLayout({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-lphie-cream p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-lphie-gold text-lphie-ink font-display text-2xl font-bold">
            ΛΦΕ
          </div>
          <h1 className="font-display text-3xl font-bold text-lphie-ink">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-lphie-ink/70">{subtitle}</p>}
        </div>
        <div className="rounded-2xl border border-lphie-ink/5 bg-white p-6 shadow-widget">
          {children}
        </div>
        <p className="mt-6 text-center text-xs text-lphie-ink/50">
          Lambda Phi Epsilon · Beta Zeta · Virginia Tech
        </p>
      </div>
    </div>
  );
}
