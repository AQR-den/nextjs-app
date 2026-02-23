"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { getDateParam } from "@/lib/utils/datetime";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function AvailabilityPreview() {
  const query = useQuery({
    queryKey: ["availability-preview"],
    queryFn: () => api.getAvailability(getDateParam()),
    refetchInterval: 10000
  });

  const availableCount = query.data?.slots.filter((slot) => slot.state === "available" || slot.state === "individuals_slot")
    .length;

  return (
    <Card className="transition hover:bg-white/[0.07]">
      <h3 className="text-lg font-semibold">Today&apos;s availability</h3>
      {query.isLoading ? <p className="mt-2 text-sm text-muted">Checking live slots...</p> : null}
      {query.data ? (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Badge tone="success">{availableCount} open slots</Badge>
          <Badge tone="warning">Individuals Slot (R80) — Court 4 — 17:00–18:00</Badge>
          <p className="text-sm text-muted">Book right up to kick-off if the slot is vacant.</p>
        </div>
      ) : null}
    </Card>
  );
}
