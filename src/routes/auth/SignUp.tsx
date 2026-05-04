import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { toast } from "@/components/ui/Toast";
import { AuthLayout } from "./SignIn";

export default function SignUp() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }
    setSubmitting(true);
    const res = await signUp({ email, password, fullName });
    setSubmitting(false);
    if (!res.ok) {
      toast.error(res.message ?? "Sign up failed");
      return;
    }
    toast.success("Welcome to the chapter dashboard.");
    navigate("/", { replace: true });
  }

  return (
    <AuthLayout title="Join the chapter" subtitle="Create your account.">
      <form onSubmit={onSubmit} className="space-y-4">
        <Input
          label="Full name"
          name="fullName"
          required
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />
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
          autoComplete="new-password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Button type="submit" size="lg" className="w-full" isLoading={submitting}>
          Create account
        </Button>
        <p className="pt-2 text-center text-sm text-lphie-ink/70">
          Already a brother?{" "}
          <Link className="font-semibold text-lphie-accent hover:underline" to="/auth/signin">
            Sign in
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
