"use client";

import Link from "next/link";
import { PropsWithChildren } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function AuthGuard({ children }: PropsWithChildren) {
  const { user, loading } = useAuth();

  if (loading) {
    return <p className="text-sm text-muted">Loading session...</p>;
  }

  if (!user) {
    return (
      <Card className="max-w-md text-center">
        <h3 className="text-xl font-semibold">Sign in required</h3>
        <p className="mt-2 text-sm text-muted">You can browse schedules as a guest, but booking requires authentication.</p>
        <div className="mt-4">
          <Link href="/auth/sign-in">
            <Button>Go to sign in</Button>
          </Link>
        </div>
      </Card>
    );
  }

  return <>{children}</>;
}
