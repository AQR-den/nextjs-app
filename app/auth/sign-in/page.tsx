"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { apiClient } from "@/lib/api/client";
import { useAuth } from "@/components/auth/auth-provider";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { DEMO_ACCOUNTS, DEMO_MODE } from "@/lib/config/demo";

export default function SignInPage() {
  const router = useRouter();
  const { signIn } = useAuth();
  const { push } = useToast();
  const [loading, setLoading] = useState(false);

  async function handleSignIn(email: string, password: string) {
    setLoading(true);
    try {
      const result = await apiClient.signIn({ email, password });
      signIn(result.token, result.user);
      router.push("/booking");
    } catch (error) {
      push(error instanceof Error ? error.message : "Unable to sign in");
    } finally {
      setLoading(false);
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    await handleSignIn(String(formData.get("email")), String(formData.get("password")));
  }

  return (
    <Card className="mx-auto max-w-md">
      <h1 className="text-2xl font-bold">Sign in</h1>
      {DEMO_MODE ? (
        <p className="mt-2 text-sm text-muted">
          Demo mode is enabled. Use the demo buttons below or log in manually.
        </p>
      ) : (
        <p className="mt-2 text-sm text-muted">Use your Tekkerz credentials to continue.</p>
      )}
      {DEMO_MODE ? (
        <div className="mt-4 grid gap-2 rounded-xl border border-white/10 bg-white/5 p-3 text-sm">
          <p className="text-xs uppercase tracking-[0.2em] text-muted">Use Demo Account</p>
          <Button
            type="button"
            variant="primary"
            disabled={loading}
            onClick={() => handleSignIn(DEMO_ACCOUNTS.court.email, DEMO_ACCOUNTS.court.password)}
          >
            {DEMO_ACCOUNTS.court.label}
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={loading}
            onClick={() => handleSignIn(DEMO_ACCOUNTS.individual.email, DEMO_ACCOUNTS.individual.password)}
          >
            {DEMO_ACCOUNTS.individual.label}
          </Button>
          <p className="text-xs text-muted">Password (demo only): {DEMO_ACCOUNTS.court.password}</p>
        </div>
      ) : null}
      <form className="mt-4 grid gap-3" onSubmit={onSubmit}>
        <Input label="Email" name="email" type="email" required />
        <Input label="Password" name="password" type="password" required />
        <Button type="submit" disabled={loading}>{loading ? "Signing in..." : "Sign in"}</Button>
      </form>
      <div className="mt-3 flex justify-between text-sm text-muted">
        <Link href="/auth/sign-up">Create account</Link>
        <Link href="/auth/forgot-password">Forgot password?</Link>
      </div>
    </Card>
  );
}
