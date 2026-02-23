"use client";

import { FormEvent, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/api/client";

export default function ForgotPasswordPage() {
  const [message, setMessage] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const result = await apiClient.forgotPassword({ email: String(formData.get("email")) });
    setMessage(result.message);
  }

  return (
    <Card className="mx-auto max-w-md">
      <h1 className="text-2xl font-bold">Forgot password</h1>
      <p className="mt-2 text-sm text-muted">Mock flow: we do not send a real email in demo mode.</p>
      <form className="mt-4 grid gap-3" onSubmit={onSubmit}>
        <Input label="Email" name="email" type="email" required />
        <Button type="submit">Request reset</Button>
      </form>
      {message ? <p className="mt-3 text-sm text-emerald-300">{message}</p> : null}
    </Card>
  );
}
