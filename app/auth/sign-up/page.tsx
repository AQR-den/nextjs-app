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

export default function SignUpPage() {
  const router = useRouter();
  const { signIn } = useAuth();
  const { push } = useToast();
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    const formData = new FormData(event.currentTarget);

    try {
      const result = await apiClient.signUp({
        name: String(formData.get("name")),
        email: String(formData.get("email")),
        phone: String(formData.get("phone")),
        password: String(formData.get("password"))
      });
      signIn(result.token, result.user);
      router.push("/booking");
    } catch (error) {
      push(error instanceof Error ? error.message : "Unable to create account");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="mx-auto max-w-md">
      <h1 className="text-2xl font-bold">Create account</h1>
      <form className="mt-4 grid gap-3" onSubmit={onSubmit}>
        <Input label="Full name" name="name" required />
        <Input label="Email" name="email" type="email" required />
        <Input label="Phone" name="phone" />
        <Input label="Password" name="password" type="password" minLength={8} required />
        <Button type="submit" disabled={loading}>{loading ? "Creating..." : "Sign up"}</Button>
      </form>
      <p className="mt-3 text-sm text-muted">
        Already have an account? <Link href="/auth/sign-in" className="underline">Sign in</Link>
      </p>
    </Card>
  );
}
