"use client";

import { DateTime } from "luxon";
import { Court, Slot } from "@/lib/types/domain";
import { cancellationDeadline, paymentDeadline } from "@/lib/utils/datetime";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CountdownTimer } from "@/components/booking/countdown-timer";

export function BookingSummary({ slot, court }: { slot: Slot | null; court: Court | null }) {
  return (
    <Card className="sticky top-20">
      <h3 className="text-lg font-semibold">Booking summary</h3>
      {!slot || !court ? <p className="mt-2 text-sm text-muted">Select an available slot to continue.</p> : null}
      {slot && court ? (
        <div className="mt-3 grid gap-3 text-sm">
          <p>
            <span className="text-muted">Court:</span> {court.name}
          </p>
          <p>
            <span className="text-muted">Time:</span>{" "}
            {DateTime.fromISO(slot.startDateTime).toFormat("dd LLL yyyy, HH:mm")} -{" "}
            {DateTime.fromISO(slot.endDateTime).toFormat("HH:mm")}
          </p>
          <p>
            <span className="text-muted">Price:</span> ZAR {slot.price}
          </p>

          {slot.isSpecialIndividualsSlot ? (
            <div className="grid gap-2 rounded-xl border border-fuchsia-300/40 bg-fuchsia-500/10 p-3">
              <Badge tone="warning">Individuals Slot (R80) — Court 4 — 17:00–18:00</Badge>
              <p className="text-xs text-fuchsia-100">Payment required immediately upon booking.</p>
              <p className="text-xs text-muted">
                Payment deadline: {paymentDeadline(slot.startDateTime).toFormat("dd LLL yyyy, HH:mm")}
              </p>
            </div>
          ) : null}

          <CountdownTimer targetIso={cancellationDeadline(slot.startDateTime).toISO()!} className="mt-1" />
          <p className="rounded-lg bg-white/5 p-3 text-xs text-muted">
            Cancellation policy: allowed only when requested more than 24 hours before start time.
          </p>
        </div>
      ) : null}
    </Card>
  );
}
