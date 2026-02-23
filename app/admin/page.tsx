"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/components/auth/auth-provider";
import { apiClient } from "@/lib/api/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function AdminPage() {
  const { token } = useAuth();

  if (process.env.NEXT_PUBLIC_ENABLE_ADMIN !== "true") {
    return <p className="text-sm text-muted">Admin UI disabled. Set NEXT_PUBLIC_ENABLE_ADMIN=true to view this page.</p>;
  }

  if (!token) {
    return <p className="text-sm text-muted">Sign in as admin user to access this page.</p>;
  }

  return <AdminPanel token={token} />;
}

function AdminPanel({ token }: { token: string }) {
  const query = useQuery({
    queryKey: ["admin-bookings"],
    queryFn: () => apiClient.getAdminBookings(token),
    refetchInterval: 10000
  });

  if (query.isLoading) {
    return <p className="text-sm text-muted">Loading admin dashboard...</p>;
  }

  const bookings = query.data?.bookings || [];
  const individual = bookings.filter((b) => b.booking.courtId === 4 && b.booking.startDateTime.includes("T17:00"));
  const refunded = bookings.filter((b) => ["refunded", "credited"].includes(b.payment?.status || ""));

  return (
    <div className="grid gap-4">
      <h1 className="text-3xl font-bold">Admin Visibility</h1>
      <div className="grid gap-4 md:grid-cols-3">
        <Card><p className="text-sm text-muted">Total bookings</p><p className="text-3xl font-bold">{bookings.length}</p></Card>
        <Card><p className="text-sm text-muted">Individuals slot usage</p><p className="text-3xl font-bold">{individual.length}</p></Card>
        <Card><p className="text-sm text-muted">Refunds / credits</p><p className="text-3xl font-bold">{refunded.length}</p></Card>
      </div>

      <Card>
        <h2 className="text-xl font-semibold">Recent bookings</h2>
        <div className="mt-3 grid gap-2 text-sm">
          {bookings.slice(0, 20).map((entry) => (
            <div key={entry.booking.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-white/5 px-3 py-2">
              <span>{entry.booking.reference} • {entry.court.name}</span>
              <div className="flex items-center gap-2">
                <Badge tone={entry.booking.status === "booked" ? "success" : "neutral"}>{entry.booking.status}</Badge>
                <Badge tone={["refunded", "credited", "paid"].includes(entry.payment?.status || "") ? "success" : "warning"}>
                  {entry.payment?.status || "payment_pending"}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
