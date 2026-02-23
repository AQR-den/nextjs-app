"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiClient } from "@/lib/api/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DEMO_MODE } from "@/lib/config/demo";

export default function DemoResetPage() {
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [message, setMessage] = useState<string>("");

  const runReset = async () => {
    if (!DEMO_MODE) {
      setStatus("error");
      setMessage("Demo mode is disabled. Enable NEXT_PUBLIC_DEMO_MODE=true to use this page.");
      return;
    }

    setStatus("loading");
    setMessage("");
    try {
      const result = await apiClient.resetDemo();
      setStatus("done");
      setMessage(`Demo reset complete. Users: ${result.users}, bookings: ${result.bookings}.`);
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Reset failed.");
    }
  };

  useEffect(() => {
    runReset();
  }, []);

  return (
    <div className="grid gap-6">
      <Card className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-bold">Demo reset</h1>
        <p className="mt-2 text-sm text-muted">This page resets demo bookings, payments, and wallet state.</p>
        <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-4 text-sm">
          {status === "loading" ? "Resetting demo data..." : message || "Ready."}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={runReset} disabled={status === "loading"}>
            {status === "loading" ? "Resetting..." : "Reset demo data"}
          </Button>
          <Link href="/my-bookings">
            <Button variant="ghost">Back to My Bookings</Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
